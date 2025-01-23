use super::ClientError;
use crate::api::token::ApiToken;
use tungstenite::handshake::client::generate_key;
use tungstenite::http::{
    header::{AUTHORIZATION, CONNECTION, HOST, SEC_WEBSOCKET_KEY, SEC_WEBSOCKET_VERSION, UPGRADE},
    Request,
};

pub fn authorized_request(url: reqwest::Url, token: ApiToken) -> Result<Request<()>, ClientError> {
    let hostname = url.host().ok_or(ClientError::InvalidUrl)?.to_string();

    Ok(Request::builder()
        .uri(url.to_string())
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(HOST, hostname)
        .header(CONNECTION, "Upgrade")
        .header(UPGRADE, "websocket")
        // ref: https://github.com/snapview/tungstenite-rs/blob/c16778797b2eeb118aa064aa5b483f90c3989627/src/client.rs#L240
        .header(SEC_WEBSOCKET_VERSION, "13")
        .header(SEC_WEBSOCKET_KEY, generate_key())
        .body(())?)
}
