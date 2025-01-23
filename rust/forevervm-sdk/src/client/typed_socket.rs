use super::ClientError;
use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use serde::{de::DeserializeOwned, Serialize};
use std::marker::PhantomData;
use tokio::net::TcpStream;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use tungstenite::{client::IntoClientRequest, Message};

pub async fn websocket_connect<Send: Serialize, Recv: DeserializeOwned>(
    req: impl IntoClientRequest + Unpin,
) -> Result<(WebSocketSend<Send>, WebSocketRecv<Recv>), ClientError> {
    let (socket, _) = tokio_tungstenite::connect_async(req).await?;
    let (socket_send, socket_recv) = socket.split();

    Ok((
        WebSocketSend {
            socket_send,
            _phantom: PhantomData,
        },
        WebSocketRecv {
            socket_recv,
            _phantom: PhantomData,
        },
    ))
}

pub struct WebSocketSend<Send: Serialize> {
    socket_send: SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
    _phantom: PhantomData<Send>,
}

impl<Send: Serialize> WebSocketSend<Send> {
    pub async fn send(&mut self, msg: &Send) -> Result<(), ClientError> {
        self.socket_send
            .send(Message::Text(serde_json::to_string(msg)?.into()))
            .await?;
        Ok(())
    }
}

pub struct WebSocketRecv<Recv: DeserializeOwned> {
    socket_recv: SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    _phantom: PhantomData<Recv>,
}

impl<Recv: DeserializeOwned> WebSocketRecv<Recv> {
    pub async fn recv(&mut self) -> Result<Option<Recv>, ClientError> {
        let Some(msg) = self.socket_recv.next().await else {
            return Ok(None);
        };
        Ok(serde_json::from_str(&msg?.into_text()?)?)
    }
}
