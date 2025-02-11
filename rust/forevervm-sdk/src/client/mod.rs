use crate::api::{
    api_types::{ApiExecRequest, ApiExecResponse, ApiExecResultResponse, Instruction},
    http_api::{CreateMachineResponse, ListMachinesResponse, WhoamiResponse},
    id_types::{InstructionSeq, MachineName},
    token::ApiToken,
};
use error::{ClientError, Result};
use repl::ReplConnection;
use reqwest::{Client, Method, Response, Url};
use serde::{de::DeserializeOwned, Serialize};

pub mod error;
pub mod repl;
pub mod typed_socket;
pub mod util;

pub struct ForeverVMClient {
    api_base: Url,
    client: Client,
    token: ApiToken,
}

async fn parse_error(response: Response) -> Result<ClientError> {
    let code = response.status().as_u16();
    let message = response.text().await?;

    if let Ok(err) = serde_json::from_str(&message) {
        Err(ClientError::ApiError(err))
    } else {
        Err(ClientError::ServerResponseError { code, message })
    }
}

impl ForeverVMClient {
    pub fn new(api_base: Url, token: ApiToken) -> Self {
        Self {
            api_base,
            token,
            client: Client::new(),
        }
    }

    pub fn server_url(&self) -> &Url {
        &self.api_base
    }

    pub async fn repl(&self, machine_name: &MachineName) -> Result<ReplConnection> {
        let mut base_url = self.api_base.clone();
        match base_url.scheme() {
            "http" => {
                base_url
                    .set_scheme("ws")
                    .map_err(|_| ClientError::InvalidUrl)?;
            }
            "https" => {
                base_url
                    .set_scheme("wss")
                    .map_err(|_| ClientError::InvalidUrl)?;
            }
            _ => return Err(ClientError::InvalidUrl),
        }

        let url = base_url.join(&format!("/v1/machine/{machine_name}/repl"))?;
        ReplConnection::new(url, self.token.clone()).await
    }

    async fn post_request<Request: Serialize, Response: DeserializeOwned>(
        &self,
        path: &str,
        request: Request,
    ) -> Result<Response> {
        let url = self.api_base.join(&format!("/v1{}", path))?;
        let response = self
            .client
            .request(Method::POST, url)
            .header("x-forevervm-sdk", "rust")
            .bearer_auth(self.token.to_string())
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(parse_error(response).await?);
        }

        Ok(response.json().await?)
    }

    async fn get_request<Response: DeserializeOwned>(&self, path: &str) -> Result<Response> {
        let url = self.api_base.join(&format!("/v1{}", path))?;
        let response = self
            .client
            .request(Method::GET, url)
            .header("x-forevervm-sdk", "rust")
            .bearer_auth(self.token.to_string())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(parse_error(response).await?);
        }

        Ok(response.json().await?)
    }

    pub async fn create_machine(&self) -> Result<CreateMachineResponse> {
        self.post_request("/machine/new", ()).await
    }

    pub async fn list_machines(&self) -> Result<ListMachinesResponse> {
        self.get_request("/machine/list").await
    }

    pub async fn exec_instruction(
        &self,
        machine_name: &MachineName,
        instruction: Instruction,
    ) -> Result<ApiExecResponse> {
        let request = ApiExecRequest {
            instruction,
            interrupt: false,
        };

        self.post_request(&format!("/machine/{machine_name}/exec"), request)
            .await
    }

    pub async fn exec_result(
        &self,
        machine_name: &MachineName,
        instruction: InstructionSeq,
    ) -> Result<ApiExecResultResponse> {
        self.get_request(&format!(
            "/machine/{machine_name}/exec/{instruction}/result"
        ))
        .await
    }

    pub async fn whoami(&self) -> Result<WhoamiResponse> {
        self.get_request("/whoami").await
    }
}
