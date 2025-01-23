use crate::{api::token::ApiToken, client::ForeverVMClient, config::ConfigManager};
use colorize::AnsiColor;
use url::Url;

pub async fn whoami() -> anyhow::Result<()> {
    let client = ConfigManager::new()?.client()?;

    match client.whoami().await {
        Ok(whoami) => {
            println!(
                "Logged in to {} as {}",
                client.server_url().to_string().b_magenta(),
                whoami.account.b_green(),
            );
        }
        Err(err) => {
            return Err(anyhow::anyhow!(err));
        }
    }
    Ok(())
}

pub async fn login(base_url: Url) -> anyhow::Result<()> {
    let config_manager = ConfigManager::new()?;
    let config = config_manager.load()?;

    if config.server_url()? == base_url {
        if let Some(token) = &config.token {
            let client = ForeverVMClient::new(base_url.clone(), token.clone());
            match client.whoami().await {
                Ok(whoami) => {
                    println!("Already logged in as {}", whoami.account.b_green());
                    return Ok(());
                }
                Err(err) => {
                    println!("There is an existing token, but it gives an error: {}", err);
                    println!("The existing token will be replaced.")
                }
            }
        }
    } else if config.token.is_some() {
        println!("There is an existing token for another server. It will be replaced.")
    }

    let token = rpassword::prompt_password("Enter your token: ")?;
    let token = ApiToken::new(token);
    let client = ForeverVMClient::new(base_url.clone(), token.clone());
    match client.whoami().await {
        Ok(whoami) => {
            println!("Logged in as {}", whoami.account.b_green());
        }
        Err(err) => {
            println!("Error: {}", err);
            return Err(err.into());
        }
    }

    let mut config = config;
    config.token = Some(token);
    config.server_url = Some(base_url);
    config_manager.save(&config)?;

    Ok(())
}
