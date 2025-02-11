use std::env;

use crate::config::ConfigManager;
use colorize::AnsiColor;
use dialoguer::{theme::ColorfulTheme, Input, Password};
use forevervm_sdk::{
    api::{api_types::ApiSignupRequest, token::ApiToken, ApiErrorResponse},
    client::ForeverVMClient,
    util::{validate_account_name, validate_email},
};
use reqwest::{Client, Url};

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

pub async fn signup(base_url: Url) -> anyhow::Result<()> {
    let config_manager = ConfigManager::new()?;
    let config = config_manager.load()?;
    if config.token.is_some() {
        println!("Already logged in");
        return Ok(());
    }

    println!(
        "Enter your email and an account name below, and we'll send you a ForeverVM API token!\n"
    );

    let email = Input::with_theme(&ColorfulTheme::default())
        .with_prompt("Enter your email")
        .allow_empty(false)
        .validate_with(|input: &String| -> Result<(), &str> {
            if validate_email(input.trim()) {
                Ok(())
            } else {
                Err("Please enter a valid email address (example: name@company.com)")
            }
        })
        .interact_text()?
        .trim()
        .to_string();

    let account_name = Input::with_theme(&ColorfulTheme::default())
        .with_prompt("Give your account a name")
        .allow_empty(false)
        .validate_with(|input: &String| -> Result<(), &str> {
            if validate_account_name(input.trim()) {
                Ok(())
            } else {
                Err("Account names must be between 3 and 16 characters, and can only contain alphanumeric characters, underscores, and hyphens. (Note: account names are not case-sensitive.)")
            }
        })
        .interact_text()?
        .trim()
        .to_string();

    let client = Client::new();
    // base_url is always suffixed with a /
    let url = format!("{}internal/signup", base_url);
    let runner = env::var("FOREVERVM_RUNNER").ok();
    let mut builder = client.post(url);
    if let Some(ref runner) = runner {
        builder = builder.header("x-forevervm-runner", runner);
    }

    let response = builder
        .json(&ApiSignupRequest {
            email: email.clone(),
            account_name: account_name.clone(),
        })
        .send()
        .await?;

    if response.status().is_success() {
        let mut command = "forevervm login".to_string().b_green();
        if let Some(ref runner) = runner {
            command = format!("{runner} {command}").b_green();
        }

        println!(
            "\nSuccess! Check your email for your API token! Then run {} to log in.\n",
            command
        );
        return Ok(());
    }

    let status_code = response.status();
    let response_body = response.text().await?;
    match serde_json::from_str::<ApiErrorResponse>(&response_body) {
        Ok(body) => {
            if body.code == "AccountNameAlreadyExists" {
                Err(anyhow::anyhow!(
                    "Account already exists. Please sign up with a different account name."
                ))
            } else if body.code == "EmailAlreadyExists" {
                Err(anyhow::anyhow!("Email is already signed up. Check your email for your API token, or use a different email address."))
            } else {
                Err(anyhow::anyhow!(body))
            }
        }
        Err(err) => Err(anyhow::anyhow!(format!(
            "Unable to parse response as JSON. status code: {}, error: {}. response body: {}",
            status_code, err, response_body
        ))),
    }
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

    let token = Password::new().with_prompt("Enter your token").interact()?;

    let token = ApiToken::new(token)?;
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

pub async fn logout() -> anyhow::Result<()> {
    let config_manager = ConfigManager::new()?;
    let mut config = config_manager.load()?;

    if config.token.is_none() {
        println!("Not currently logged in");
        return Ok(());
    }

    // Clear the token
    config.token = None;
    config_manager.save(&config)?;
    println!("Successfully logged out");
    Ok(())
}
