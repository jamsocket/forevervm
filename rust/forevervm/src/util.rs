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
    // from: https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
    let email_regex = Regex::new(r#"(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])"#).unwrap();
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
