use forevervm_sdk::api::api_types::Instruction;
use forevervm_sdk::client::{CreateMachineOptions, ListMachinesOptions};
use forevervm_sdk::{
    api::{api_types::ExecResultType, protocol::StandardOutputStream, token::ApiToken},
    client::ForeverVMClient,
};
use std::env;
use url::Url;

fn get_test_credentials() -> (Url, ApiToken) {
    let api_base = env::var("FOREVERVM_API_BASE")
        .expect("FOREVERVM_API_BASE environment variable must be set");
    let token =
        env::var("FOREVERVM_TOKEN").expect("FOREVERVM_TOKEN environment variable must be set");
    (
        Url::parse(&api_base).unwrap(),
        ApiToken::new(token).unwrap(),
    )
}

#[tokio::test]
async fn test_whoami() {
    let (api_base, token) = get_test_credentials();
    let client = ForeverVMClient::new(api_base, token);
    let whoami = client.whoami().await.expect("whoami call failed");
    assert!(!whoami.account.is_empty());
}

#[tokio::test]
async fn test_create_machine() {
    let (api_base, token) = get_test_credentials();
    let client = ForeverVMClient::new(api_base, token);

    // Create a new machine
    let machine = client
        .create_machine(CreateMachineOptions::default())
        .await
        .expect("failed to create machine");
    let machine_name = machine.machine_name;
    assert!(!machine_name.to_string().is_empty());

    // Verify machine appears in list
    let machines = client
        .list_machines(ListMachinesOptions::default())
        .await
        .expect("failed to list machines");
    assert!(machines.machines.iter().any(|m| m.name == machine_name));
}

#[tokio::test]
async fn test_exec() {
    let (api_base, token) = get_test_credentials();
    let client = ForeverVMClient::new(api_base, token);

    // Create machine and execute code
    let machine = client
        .create_machine(CreateMachineOptions::default())
        .await
        .expect("failed to create machine");
    let code = "print(123) or 567";
    let result = client
        .exec_instruction(
            &machine.machine_name,
            Instruction {
                code: code.to_string(),
                timeout_seconds: 10,
            },
        )
        .await
        .expect("exec failed");
    let exec_result = client
        .exec_result(
            &machine.machine_name,
            result.instruction_seq.expect("instruction seq missing"),
        )
        .await
        .expect("failed to get exec result");

    assert_eq!(
        exec_result.result.result,
        ExecResultType::Value {
            value: Some("567".to_string()),
            data: None
        }
    );
}

#[tokio::test]
async fn test_repl() {
    let (api_base, token) = get_test_credentials();
    let client = ForeverVMClient::new(api_base, token);

    // Create machine and get REPL
    let machine = client
        .create_machine(CreateMachineOptions::default())
        .await
        .expect("failed to create machine");
    let mut repl = client
        .repl(&machine.machine_name)
        .await
        .expect("failed to create REPL");
    assert_eq!(repl.machine_name, machine.machine_name);

    // Execute code that produces multiple outputs
    let code = "for i in range(5):\n  print(i)";
    let mut result = repl.exec(code).await.expect("failed to execute code");

    // Collect all output
    let mut outputs = Vec::new();
    while let Some(output) = result.next().await {
        outputs.push(output);
    }

    // Verify outputs
    assert_eq!(outputs.len(), 5);
    for (i, output) in outputs.iter().enumerate() {
        assert_eq!(output.stream, StandardOutputStream::Stdout);
        assert_eq!(output.data, i.to_string());
        assert_eq!(output.seq, (i as i64).into());
    }

    // Execute code that results in an error
    let code = "1 / 0";
    let exec_result = repl.exec(code).await.expect("failed to execute code");

    let result = exec_result.result().await.unwrap();
    let ExecResultType::Error { error } = result.result else {
        panic!("Expected error");
    };

    assert!(error.contains("ZeroDivisionError"));
    assert!(error.contains("division by zero"));
}
