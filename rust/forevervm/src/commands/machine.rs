use crate::{config::ConfigManager, util::ApproximateDuration};
use chrono::Utc;
use colorize::AnsiColor;
use forevervm_sdk::api::http_api::{CreateMachineRequest, ListMachinesRequest};

pub async fn machine_list() -> anyhow::Result<()> {
    let client = ConfigManager::new()?.client()?;
    let machines = client.list_machines(ListMachinesRequest::default()).await?;

    println!("Machines:");
    for machine in machines.machines {
        let expires_at = if let Some(expires_at) = machine.expires_at {
            expires_at.to_string()
        } else {
            "never".to_string()
        };

        let status = if machine.has_pending_instruction {
            "has_work".to_string()
        } else {
            "idle".to_string()
        };

        let age = ApproximateDuration::from(Utc::now() - machine.created_at);

        println!("{}", machine.name.to_string().b_green());
        println!(
            "  Created: {} ago ({})",
            age.to_string().b_yellow(),
            machine.created_at.to_string().b_yellow()
        );
        println!("  Expires: {}", expires_at.b_yellow());
        println!("  Status:  {}", status.b_yellow());
        println!("  Running: {}", machine.running.to_string().b_yellow());
        for (key, value) in machine.tags.into_iter() {
            println!("  Tag: {} = {}", key.b_yellow(), value.b_yellow());
        }
        println!();
    }

    Ok(())
}

pub async fn machine_new(tags: std::collections::HashMap<String, String>) -> anyhow::Result<()> {
    let client = ConfigManager::new()?.client()?;

    let request = CreateMachineRequest { tags };
    let machine = client.create_machine(request).await?;

    println!(
        "Created machine {}",
        machine.machine_name.to_string().b_green()
    );

    Ok(())
}
