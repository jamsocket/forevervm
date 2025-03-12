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
    tags: HashMap<String, String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ListMachinesRequest {
    tags: HashMap<String, String>,
}
