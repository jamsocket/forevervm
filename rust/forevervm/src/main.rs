#![deny(clippy::unwrap_used)]

use clap::{Parser, Subcommand};
use forevervm::{
    commands::{
        auth::{login, logout, signup, whoami},
        machine::{machine_list, machine_new},
        repl::machine_repl,
    },
    DEFAULT_SERVER_URL,
};
use forevervm_sdk::api::id_types::MachineName;
use url::Url;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
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
    Repl {
        /// The name of the machine to run a repl on.
        machine_name: Option<MachineName>,
    },
}

#[derive(Subcommand)]
enum MachineCommands {
    /// Create a new machine
    New,
    /// List all machines
    List,
    /// Start a REPL session for a specific machine
    Repl {
        /// The name of the machine to run a repl on.
        machine_name: Option<MachineName>,
    },
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
            MachineCommands::Repl { machine_name } => {
                machine_repl(machine_name).await?;
            }
        },
        Commands::Repl { machine_name } => {
            machine_repl(machine_name).await?;
        }
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    if let Err(e) = main_inner().await {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
