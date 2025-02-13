use std::env;

use regex::Regex;

pub fn validate_email(email: &str) -> bool {
    let email_regex = Regex::new(r#"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"#)
        .expect("Static verified regex should always compile");
    email_regex.is_match(email)
}

pub fn validate_account_name(account_name: &str) -> bool {
    if account_name.len() < 3 || account_name.len() > 16 {
        return false;
    }
    account_name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '_' || c == '-')
}

pub fn get_runner() -> Option<String> {
    env::var("FOREVERVM_RUNNER").ok()
}
