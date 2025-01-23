use crate::config::ConfigManager;
use colorize::AnsiColor;
use forevervm_client::api::{api_types::ExecResultType, id_types::MachineName};
use rustyline::{error::ReadlineError, DefaultEditor};

pub async fn machine_repl(machine_name: Option<MachineName>) -> anyhow::Result<()> {
    let client = ConfigManager::new()?.client()?;

    let machine_name = if let Some(machine_name) = machine_name {
        machine_name
    } else {
        let machine = client.create_machine().await?;
        machine.machine_name
    };

    let mut repl = client.repl(&machine_name).await?;

    println!("Connected to {}", machine_name.to_string().b_green());

    let mut rl = DefaultEditor::new()?;

    loop {
        let readline = rl.readline(">>> ");

        match readline {
            Ok(line) => {
                let result = repl.exec(&line).await;
                match result {
                    Ok(mut result) => {
                        while let Some(output) = result.next().await {
                            println!("{}", output.data);
                        }

                        let result = result.result().await;
                        match result {
                            Ok(result) => match result.result {
                                ExecResultType::Error(err) => {
                                    eprintln!("Error: {}", err);
                                }
                                ExecResultType::Value(Some(data)) => {
                                    println!("{}", data);
                                }
                                ExecResultType::Value(None) => {}
                            },
                            Err(err) => {
                                eprintln!("Error: {}", err);
                            }
                        }
                    }
                    Err(err) => {
                        eprintln!("Error: {}", err);
                    }
                }
            }
            Err(ReadlineError::Interrupted) => {
                break;
            }
            Err(err) => {
                eprintln!("Error: {}", err);
                break;
            }
        }
    }

    Ok(())
}
