use chrono::Duration;
use regex::Regex;
use std::fmt::Display;

pub enum ApproximateDuration {
    Days(i64),
    Hours(i64),
    Minutes(i64),
    Seconds(i64),
}

impl Display for ApproximateDuration {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApproximateDuration::Days(days) => write!(f, "{} days", days),
            ApproximateDuration::Hours(hours) => write!(f, "{} hours", hours),
            ApproximateDuration::Minutes(minutes) => write!(f, "{} minutes", minutes),
            ApproximateDuration::Seconds(seconds) => write!(f, "{} seconds", seconds),
        }
    }
}

impl From<Duration> for ApproximateDuration {
    fn from(duration: Duration) -> Self {
        let days = duration.num_days();

        if days > 3 {
            return Self::Days(days);
        }

        let hours = duration.num_hours();
        if hours > 3 {
            return Self::Hours(hours);
        }

        let minutes = duration.num_minutes();
        if minutes > 3 {
            return Self::Minutes(minutes);
        }

        Self::Seconds(duration.num_seconds())
    }
}

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
