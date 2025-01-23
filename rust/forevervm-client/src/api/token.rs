use serde::{Deserialize, Serialize};
use std::{fmt::Display, str::FromStr};

const SEPARATOR: &str = ".";

#[derive(Debug, Clone)]
pub struct ApiToken {
    pub id: String,
    pub token: String,
}

impl ApiToken {
    pub fn new(token: String) -> Self {
        let (id, token) = token.split_once(SEPARATOR).unwrap();
        Self {
            id: id.to_string(),
            token: token.to_string(),
        }
    }
}

impl Serialize for ApiToken {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for ApiToken {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::from_str(&s).map_err(serde::de::Error::custom)
    }
}

#[derive(thiserror::Error, Debug)]
pub enum ApiTokenError {
    #[error("Invalid token format")]
    InvalidFormat,
}

impl FromStr for ApiToken {
    type Err = ApiTokenError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (id, token) = s
            .split_once(SEPARATOR)
            .ok_or(ApiTokenError::InvalidFormat)?;
        Ok(Self {
            id: id.to_string(),
            token: token.to_string(),
        })
    }
}

impl Display for ApiToken {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}{}{}", self.id, SEPARATOR, self.token)
    }
}
