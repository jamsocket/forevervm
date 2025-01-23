use crate::{api::token::ApiToken, client::ForeverVMClient, DEFAULT_SERVER_URL};
use anyhow::{Context, Result};
use dirs::home_dir;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use url::Url;

#[derive(Debug, Serialize, Deserialize)]
#[derive(Default)]
pub struct Config {
    pub token: Option<ApiToken>,
    pub server_url: Option<Url>,
}

impl Config {
    pub fn server_url(&self) -> Result<Url> {
        if let Some(url) = &self.server_url {
            return Ok(url.clone());
        }

        Ok(DEFAULT_SERVER_URL.parse()?)
    }
}


pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new() -> Result<Self> {
        let home_dir = home_dir().context("Failed to get home directory")?;
        let config_path = home_dir
            .join(".config")
            .join("forevervm")
            .join("config.json");

        Ok(Self { config_path })
    }

    pub fn client(&self) -> Result<ForeverVMClient> {
        let config = self.load()?;
        if let Some(token) = &config.token {
            Ok(ForeverVMClient::new(config.server_url()?, token.clone()))
        } else {
            Err(anyhow::anyhow!("Not logged in"))
        }
    }

    pub fn load(&self) -> Result<Config> {
        if !self.config_path.exists() {
            if let Some(parent) = self.config_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            return Ok(Config::default());
        }

        let config_str =
            std::fs::read_to_string(&self.config_path).context("Failed to read config file")?;
        let config = serde_json::from_str(&config_str).context("Failed to parse config file")?;
        Ok(config)
    }

    pub fn save(&self, config: &Config) -> Result<()> {
        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut config_str =
            serde_json::to_string_pretty(config).context("Failed to serialize config")?;
        config_str.push('\n');
        std::fs::write(&self.config_path, config_str).context("Failed to write config file")?;
        Ok(())
    }

    pub fn get_path(&self) -> &Path {
        &self.config_path
    }
}
