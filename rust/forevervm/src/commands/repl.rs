use crate::config::ConfigManager;
use colorize::AnsiColor;
use forevervm_sdk::api::{
    api_types::{ExecResultType, Instruction},
    id_types::MachineName,
};
use rustyline::{error::ReadlineError, DefaultEditor};
use std::time::Duration;

pub async fn machine_repl(
    machine_name: Option<MachineName>,
    instruction_timeout: Duration,
) -> anyhow::Result<()> {
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
                rl.add_history_entry(line.as_str())?;

                let instruction = Instruction {
                    code: line,
                    timeout_seconds: instruction_timeout.as_secs() as i32,
                };

                let result = repl.exec_instruction(instruction).await;
                match result {
                    Ok(mut result) => {
                        while let Some(output) = result.next().await {
                            println!("{}", output.data);
                        }

                        let result = result.result().await;
                        match result {
                            Ok(result) => match result.result {
                                ExecResultType::Error { error } => {
                                    eprintln!("Error: {}", error);
                                }
                                ExecResultType::Value {
                                    value: Some(value),
                                    data: _,
                                } => {
                                    println!("{}", value);
                                }
                                ExecResultType::Value {
                                    value: None,
                                    data: _,
                                } => {}
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
