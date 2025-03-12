use super::{
    typed_socket::{websocket_connect, WebSocketRecv, WebSocketSend},
    util::authorized_request,
    ClientError,
};
use crate::api::{
    api_types::{ExecResult, Instruction},
    id_types::{InstructionSeq, MachineName, RequestSeq},
    protocol::{MessageFromServer, MessageToServer, StandardOutput},
    token::ApiToken,
};
use std::{
    ops::{Deref, DerefMut},
    sync::{atomic::AtomicU32, Arc, Mutex},
};
use tokio::{
    sync::{broadcast, oneshot},
    task::JoinHandle,
};

pub const DEFAULT_INSTRUCTION_TIMEOUT_SECONDS: i32 = 15;

#[derive(Default)]
pub struct RequestSeqGenerator {
    next: AtomicU32,
}

impl RequestSeqGenerator {
    pub fn next(&self) -> RequestSeq {
        let r = self.next.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        r.into()
    }
}

#[derive(Debug)]
pub enum ReplConnectionState {
    Idle,
    WaitingForInstructionSeq {
        request_id: RequestSeq,
        send_result_handle: oneshot::Sender<ExecResultHandle>,
    },
    WaitingForResult {
        instruction_id: InstructionSeq,
        output_sender: broadcast::Sender<StandardOutput>,
        result_sender: oneshot::Sender<ExecResult>,
    },
}

impl Default for ReplConnectionState {
    fn default() -> Self {
        Self::Idle
    }
}

pub struct ReplConnection {
    pub machine_name: MachineName,
    request_seq_generator: RequestSeqGenerator,
    sender: WebSocketSend<MessageToServer>,

    receiver_handle: Option<JoinHandle<()>>,
    state: Arc<Mutex<ReplConnectionState>>,
}

fn handle_message(
    message: MessageFromServer,
    state: Arc<Mutex<ReplConnectionState>>,
) -> Result<(), ClientError> {
    let msg = message;
    match msg {
        MessageFromServer::ExecReceived { seq, request_id } => {
            let mut state = state.lock().expect("State lock poisoned");
            let old_state = std::mem::take(state.deref_mut());

            match old_state {
                ReplConnectionState::WaitingForInstructionSeq {
                    request_id: expected_request_seq,
                    send_result_handle: receiver_sender,
                } => {
                    if request_id != expected_request_seq {
                        tracing::warn!(
                            ?request_id,
                            ?expected_request_seq,
                            "Unexpected request seq"
                        );
                        return Ok(());
                    }

                    let (output_sender, output_receiver) = broadcast::channel::<StandardOutput>(50);
                    let (result_sender, result_receiver) = oneshot::channel();

                    *state = ReplConnectionState::WaitingForResult {
                        instruction_id: seq,
                        output_sender,
                        result_sender,
                    };

                    let _ = receiver_sender.send(ExecResultHandle {
                        result: result_receiver,
                        receiver: output_receiver,
                    });
                }
                state => {
                    tracing::error!(?state, "Unexpected ExecReceived while in state {state:?}");
                }
            }
        }
        MessageFromServer::Result(result) => {
            let mut state = state.lock().expect("State lock poisoned");
            let old_state = std::mem::take(state.deref_mut());

            match old_state {
                ReplConnectionState::WaitingForResult {
                    instruction_id: instruction_seq,
                    result_sender,
                    ..
                } => {
                    if result.instruction_id != instruction_seq {
                        tracing::warn!(
                            ?instruction_seq,
                            ?result.instruction_id,
                            "Unexpected instruction seq"
                        );
                        return Ok(());
                    }

                    let _ = result_sender.send(result.result);
                }
                state => {
                    tracing::error!(?state, "Unexpected Result while in state {state:?}");
                }
            }
        }
        MessageFromServer::Output {
            chunk,
            instruction_id: instruction,
        } => {
            let state = state.lock().expect("State lock poisoned");

            match state.deref() {
                ReplConnectionState::WaitingForResult {
                    instruction_id: instruction_seq,
                    output_sender,
                    ..
                } => {
                    if *instruction_seq != instruction {
                        tracing::warn!(
                            ?instruction_seq,
                            ?instruction,
                            "Unexpected instruction seq"
                        );
                        return Ok(());
                    }

                    let _ = output_sender.send(chunk);
                }
                state => {
                    tracing::error!(?state, "Unexpected Output while in state {state:?}");
                }
            }
        }
        MessageFromServer::Error(err) => {
            return Err(ClientError::ApiError(err));
        }
        MessageFromServer::Connected { machine_name: _ } => {}
        msg => tracing::warn!("message type not implmented: {msg:?}"),
    }

    Ok(())
}

async fn receive_loop(
    mut receiver: WebSocketRecv<MessageFromServer>,
    state: Arc<Mutex<ReplConnectionState>>,
) {
    while let Ok(Some(msg)) = receiver.recv().await {
        if let Err(err) = handle_message(msg, state.clone()) {
            tracing::error!(?err, "Failed to handle message");
        }
    }
}

impl ReplConnection {
    pub async fn new(url: reqwest::Url, token: ApiToken) -> Result<Self, ClientError> {
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();

        let req = authorized_request(url, token)?;
        let (sender, mut receiver) =
            websocket_connect::<MessageToServer, MessageFromServer>(req).await?;

        let state: Arc<Mutex<ReplConnectionState>> = Arc::default();

        let machine_name = match receiver.recv().await? {
            Some(MessageFromServer::Connected { machine_name }) => machine_name,
            _ => {
                return Err(ClientError::Other(String::from(
                    "Expected `connected` message from REPL.",
                )))
            }
        };

        let receiver_handle = tokio::spawn(receive_loop(receiver, state.clone()));

        Ok(Self {
            machine_name,
            request_seq_generator: Default::default(),
            sender,
            receiver_handle: Some(receiver_handle),
            state,
        })
    }

    pub async fn exec(&mut self, code: &str) -> Result<ExecResultHandle, ClientError> {
        let instruction = Instruction {
            code: code.to_string(),
            timeout_seconds: DEFAULT_INSTRUCTION_TIMEOUT_SECONDS,
        };
        self.exec_instruction(instruction).await
    }

    pub async fn exec_instruction(
        &mut self,
        instruction: Instruction,
    ) -> Result<ExecResultHandle, ClientError> {
        let request_id = self.request_seq_generator.next();
        let message = MessageToServer::Exec {
            instruction,
            request_id,
        };
        self.sender.send(&message).await?;

        let (send_result_handle, receive_result_handle) = oneshot::channel::<ExecResultHandle>();
        {
            let mut state = self.state.lock().expect("State lock poisoned");

            *state.deref_mut() = ReplConnectionState::WaitingForInstructionSeq {
                request_id,
                send_result_handle,
            };
        }

        receive_result_handle
            .await
            .map_err(|_| ClientError::InstructionInterrupted)
    }
}

impl Drop for ReplConnection {
    fn drop(&mut self) {
        if let Some(handle) = self.receiver_handle.take() {
            handle.abort();
        }
    }
}

#[derive(Debug)]
pub struct ExecResultHandle {
    result: oneshot::Receiver<ExecResult>,
    receiver: broadcast::Receiver<StandardOutput>,
}

impl ExecResultHandle {
    pub async fn next(&mut self) -> Option<StandardOutput> {
        self.receiver.recv().await.ok()
    }

    pub async fn result(self) -> Result<ExecResult, ClientError> {
        self.result
            .await
            .map_err(|_| ClientError::InstructionInterrupted)
    }
}
