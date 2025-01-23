use clap::{Parser, Subcommand};
use forevervm::{
    commands::{
        auth::{login, whoami},
        machine::{machine_list, machine_new},
    },
    DEFAULT_SERVER_URL,
};
use url::Url;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Login to your account
    Login {
        #[arg(long, default_value = DEFAULT_SERVER_URL)]
        api_base_url: Url,
    },
    Whoami,
    /// Machine management commands
    Machine {
        #[command(subcommand)]
        command: MachineCommands,
    },
    /// Start a REPL session
    Repl,
}

#[derive(Subcommand)]
enum MachineCommands {
    /// Create a new machine
    New,
    /// List all machines
    List,
    /// Start a REPL session for a specific machine
    Repl,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Login { api_base_url } => {
            login(api_base_url).await.unwrap();
        }
        Commands::Whoami => {
            whoami().await.unwrap();
        }
        Commands::Machine { command } => match command {
            MachineCommands::New => {
                machine_new().await.unwrap();
            }
            MachineCommands::List => {
                machine_list().await.unwrap();
            }
            MachineCommands::Repl => {
                todo!()
            }
        },
        Commands::Repl => {
            println!("Starting global REPL...");
            todo!()
        }
    }
}
