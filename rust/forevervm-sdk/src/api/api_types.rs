use super::id_types::{InstructionSeq, MachineName};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
pub struct ApiMachine {
    pub name: MachineName,
    pub created_at: DateTime<Utc>,
    pub running: bool,
    pub has_pending_instruction: bool,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ApiExecRequest {
    pub instruction: Instruction,

    /// If true, this interrupts any currently-pending or running instruction.
    #[serde(default)]
    pub interrupt: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ApiExecResponse {
    pub instruction_seq: Option<InstructionSeq>,
    #[serde(default, skip_serializing_if = "bool_is_false")]
    pub interrupted: bool,
    pub machine: Option<MachineName>,
}

fn bool_is_false(b: &bool) -> bool {
    !*b
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ApiExecResultResponse {
    pub instruction_id: InstructionSeq,
    pub result: ExecResult,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Instruction {
    pub code: String,

    #[serde(default = "default_timeout_seconds")]
    pub timeout_seconds: i32,
}

fn default_timeout_seconds() -> i32 {
    15
}

impl Instruction {
    pub fn new(code: &str) -> Self {
        Self {
            code: code.to_string(),
            timeout_seconds: 15,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(untagged, rename_all = "snake_case")]
pub enum ExecResultType {
    Error {
        error: String,
    },

    Value {
        value: Option<String>,
        data: Option<serde_json::Value>,
    },
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ExecResult {
    #[serde(flatten)]
    pub result: ExecResultType,
    pub runtime_ms: u64,
}
