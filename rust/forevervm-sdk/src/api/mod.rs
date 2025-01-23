use serde::{Deserialize, Serialize};
use std::fmt::Display;

pub mod api_types;
pub mod http_api;
pub mod id_types;
pub mod protocol;
pub mod token;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiErrorResponse {
    pub code: String,
    pub id: Option<String>,
}

impl std::error::Error for ApiErrorResponse {}

impl Display for ApiErrorResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Api error: {{ code: {}, id: {:?} }}", self.code, self.id)
    }
}
