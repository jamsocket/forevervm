use super::{api_types::ApiMachine, id_types::MachineName};
use serde::{Deserialize, Serialize};

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
