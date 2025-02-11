use chrono::Duration;
use std::{env, fmt::Display};

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

pub fn get_runner() -> String {
    env::var("FOREVERVM_RUNNER").unwrap_or_else(|_| "cargo".to_string())
}

pub fn get_sdk() -> String {
    env::var("FOREVERVM_SDK").unwrap_or_else(|_| "rust".to_string())
}
