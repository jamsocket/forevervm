use crate::{
    api::{
        api_types::{ApiExecRequest, ApiExecResponse, ApiExecResultResponse, Instruction},
        http_api::{
            CreateMachineRequest, CreateMachineResponse, ListMachinesRequest, ListMachinesResponse,
            WhoamiResponse,
        },
        id_types::{InstructionSeq, MachineName},
        protocol::MessageFromServer,
        token::ApiToken,
    },
    util::get_runner,
};
use error::{ClientError, Result};
use futures_util::{Stream, StreamExt};
use repl::ReplConnection;
use reqwest::{
    header::{HeaderMap, HeaderValue},
    Client, Method, Response, Url,
};
use serde::{de::DeserializeOwned, Serialize};
use std::pin::Pin;

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

    fn headers() -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert("x-forevervm-sdk", HeaderValue::from_static("rust"));

        if let Some(val) = get_runner().and_then(|v| HeaderValue::from_str(&v).ok()) {
            headers.insert("x-forevervm-runner", val);
        }

        headers
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
            .headers(ForeverVMClient::headers())
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
            .headers(ForeverVMClient::headers())
            .bearer_auth(self.token.to_string())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(parse_error(response).await?);
        }

        Ok(response.json().await?)
    }

    pub async fn create_machine(
        &self,
        options: CreateMachineRequest,
    ) -> Result<CreateMachineResponse> {
        self.post_request("/machine/new", options).await
    }

    pub async fn list_machines(
        &self,
        options: ListMachinesRequest,
    ) -> Result<ListMachinesResponse> {
        self.post_request("/machine/list", options).await
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

    /// Returns a stream of `MessageFromServer` values from the execution result endpoint.
    ///
    /// This method uses HTTP streaming to receive newline-delimited JSON responses
    /// from the server. Each line is parsed into a `MessageFromServer` object.
    pub async fn exec_result_stream(
        &self,
        machine_name: &MachineName,
        instruction: InstructionSeq,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<MessageFromServer>> + Send>>> {
        let url = self.server_url().join(&format!(
            "/v1/machine/{machine_name}/exec/{instruction}/stream-result"
        ))?;

        let request = self
            .client
            .request(Method::GET, url)
            .headers(ForeverVMClient::headers())
            .bearer_auth(self.token.to_string())
            .build()?;

        let response = self.client.execute(request).await?;

        if !response.status().is_success() {
            return Err(parse_error(response).await?);
        }

        let stream = response
            .bytes_stream()
            .map(|result| -> Result<String> {
                let bytes = result?;
                Ok(String::from_utf8_lossy(&bytes).to_string())
            })
            .flat_map(|result| {
                let lines = match result {
                    Ok(text) => text.lines().map(|s| Ok(s.to_string())).collect::<Vec<_>>(),
                    Err(err) => vec![Err(err)],
                };
                futures_util::stream::iter(lines)
            })
            .filter_map(|line_result| async move {
                match line_result {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            return None;
                        }
                        match serde_json::from_str::<MessageFromServer>(&line) {
                            Ok(message) => Some(Ok(message)),
                            Err(err) => Some(Err(ClientError::from(err))),
                        }
                    }
                    Err(err) => Some(Err(err)),
                }
            });

        Ok(Box::pin(stream))
    }
}
