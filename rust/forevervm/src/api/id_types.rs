//! This module defines ID and sequence types.
//!
//! Both IDs and sequence numbers are i64s, because that's what Postgres uses, even though
//! they are never negative.
//!
//! IDs are globally unique. They should not be shared with the client directly.
//!
//! Sequence numbers sequentially increase per machine. They differ from IDs in that:
//!   - they are not globally unique
//!   - their sequential order matters
//!   - they can be shared with the client

use serde::{Deserialize, Serialize};
use std::fmt::Display;

/* Instruction sequence number ========================================================= */

/// Sequence number of an instruction for a machine. This is not globally unique, but
/// is unique per machine.
#[derive(
    Copy, Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Default, Ord, PartialOrd,
)]
pub struct InstructionSeq(pub i64);

impl From<InstructionSeq> for i64 {
    fn from(val: InstructionSeq) -> Self {
        val.0
    }
}

impl From<i64> for InstructionSeq {
    fn from(id: i64) -> Self {
        Self(id)
    }
}

impl Display for InstructionSeq {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl InstructionSeq {
    pub fn next(&self) -> InstructionSeq {
        InstructionSeq(self.0 + 1)
    }
}

/* Request sequence number ============================================================= */

/// Sequence number of an instruction for a machine. This is not globally unique, but
/// is unique per machine.
#[derive(
    Copy, Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Default, Ord, PartialOrd,
)]
pub struct RequestSeq(pub u32);

impl From<u32> for RequestSeq {
    fn from(id: u32) -> Self {
        Self(id)
    }
}

/* Machine output sequence number ====================================================== */

/// Sequence number of output from a machine. This is not globally unique, but unique within
/// a (machine, instruction) pair. (In other words, it is reset to zero between each instruction.)
#[derive(Copy, Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
pub struct MachineOutputSeq(pub i64);

impl From<MachineOutputSeq> for i64 {
    fn from(val: MachineOutputSeq) -> Self {
        val.0
    }
}

impl From<i64> for MachineOutputSeq {
    fn from(id: i64) -> Self {
        Self(id)
    }
}

impl MachineOutputSeq {
    pub fn next(&self) -> MachineOutputSeq {
        MachineOutputSeq(self.0 + 1)
    }

    pub fn zero() -> Self {
        Self(0)
    }
}

/* Machine unique name ================================================================= */

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MachineName(pub String);

impl From<MachineName> for String {
    fn from(val: MachineName) -> Self {
        val.0
    }
}

impl From<String> for MachineName {
    fn from(name: String) -> Self {
        Self(name)
    }
}

impl Display for MachineName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
