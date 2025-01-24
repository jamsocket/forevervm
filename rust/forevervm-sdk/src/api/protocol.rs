//! Types for the WebSocket protocol.

use super::{
    api_types::{ApiExecResultResponse, Instruction},
    id_types::{InstructionSeq, MachineName, MachineOutputSeq, RequestSeq},
    ApiErrorResponse,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageToServer {
    Exec {
        instruction: Instruction,
        request_id: RequestSeq,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum MessageLevel {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageFromServer {
    Connected {
        machine_name: MachineName,
    },

    ExecReceived {
        seq: InstructionSeq,
        request_id: RequestSeq,
    },

    Result(ApiExecResultResponse),

    Output {
        chunk: StandardOutput,
        instruction_id: InstructionSeq,
    },

    Error(ApiErrorResponse),

    /// Use to send log / diagnostic messages to the client.
    Message {
        message: String,
        level: MessageLevel,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum StandardOutputStream {
    #[serde(rename = "stdout")]
    Stdout,
    #[serde(rename = "stderr")]
    Stderr,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct StandardOutput {
    pub stream: StandardOutputStream,
    pub data: String,
    pub seq: MachineOutputSeq,
}
