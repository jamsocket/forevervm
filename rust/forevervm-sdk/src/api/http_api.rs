use super::{api_types::ApiMachine, id_types::MachineName};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct WhoamiResponse {
    pub account: String,
}

#[derive(Serialize, Deserialize)]
pub struct CreateMachineResponse {
    pub machine_name: MachineName,
}

#[derive(Serialize, Deserialize)]
pub struct ListMachinesResponse {
    pub machines: Vec<ApiMachine>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct CreateMachineRequest {
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub tags: HashMap<String, String>,

    /// Memory size in MB. If not specified, a default value will be used.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_mb: Option<u32>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ListMachinesRequest {
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub tags: HashMap<String, String>,
}
