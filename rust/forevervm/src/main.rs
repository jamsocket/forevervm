#![deny(clippy::unwrap_used)]

use clap::{Args, Parser, Subcommand};
use forevervm::{
    commands::{
        auth::{login, logout, signup, whoami},
        machine::{machine_list, machine_new},
        repl::machine_repl,
    },
    DEFAULT_SERVER_URL,
};
use forevervm_sdk::api::id_types::MachineName;
use std::time::Duration;
use url::Url;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Args)]
pub struct ReplConfig {
    machine_name: Option<MachineName>,
    #[arg(long, default_value = "15")]
    instruction_timeout_seconds: u64,
}

#[derive(Subcommand)]
enum Commands {
    /// Signup to your account
    Signup {
        #[arg(long, default_value = DEFAULT_SERVER_URL)]
        api_base_url: Url,
    },
    /// Login to your account
    Login {
        #[arg(long, default_value = DEFAULT_SERVER_URL)]
        api_base_url: Url,
    },
    /// Logout from your account
    Logout,
    Whoami,
    /// Machine management commands
    Machine {
        #[command(subcommand)]
        command: MachineCommands,
    },
    /// Start a REPL session
    Repl(ReplConfig),
}

#[derive(Subcommand)]
enum MachineCommands {
    /// Create a new machine
    New,
    /// List all machines
    List,
    /// Start a REPL session for a specific machine
    Repl(ReplConfig),
}

async fn main_inner() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Signup { api_base_url } => {
            signup(api_base_url).await?;
        }
        Commands::Login { api_base_url } => {
            login(api_base_url).await?;
        }
        Commands::Logout => {
            logout().await?;
        }
        Commands::Whoami => {
            whoami().await?;
        }
        Commands::Machine { command } => match command {
            MachineCommands::New => {
                machine_new().await?;
            }
            MachineCommands::List => {
                machine_list().await?;
            }
            MachineCommands::Repl(config) => {
                run_repl(config).await?;
            }
        },
        Commands::Repl(config) => {
            run_repl(config).await?;
        }
    }

    Ok(())
}

pub async fn run_repl(config: ReplConfig) -> anyhow::Result<()> {
    let instruction_timeout = Duration::from_secs(config.instruction_timeout_seconds);
    machine_repl(config.machine_name, instruction_timeout).await?;

    Ok(())
}

#[tokio::main]
async fn main() {
    if let Err(e) = main_inner().await {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
