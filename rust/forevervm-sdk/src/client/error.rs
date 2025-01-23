use crate::api::ApiErrorResponse;

pub type Result<T> = std::result::Result<T, ClientError>;

#[derive(thiserror::Error, Debug)]
pub enum ClientError {
    #[error("Api error: {0}")]
    ApiError(#[from] ApiErrorResponse),

    #[error("Reqwest error: {0}")]
    ReqwestError(#[from] reqwest::Error),

    #[error("Server responded with code {code} and message {message}")]
    ServerResponseError { code: u16, message: String },

    #[error("Invalid URL")]
    InvalidUrl,

    #[error("Error parsing url: {0}")]
    UrlError(#[from] url::ParseError),

    #[error("Error deserializing response: {0}")]
    DeserializeError(#[from] serde_json::Error),

    #[error("Error from Tungstenite: {0}")]
    TungsteniteError(#[from] tungstenite::Error),

    #[error("Http")]
    HttpError(#[from] tungstenite::http::Error),

    #[error("Instruction interrupted")]
    InstructionInterrupted,

    #[error("Other error: {0}")]
    Other(String),
}
