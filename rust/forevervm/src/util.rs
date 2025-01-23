use chrono::Duration;

pub enum ApproximateDuration {
    Days(i64),
    Hours(i64),
    Minutes(i64),
    Seconds(i64),
}

impl ApproximateDuration {
    pub fn to_string(&self) -> String {
        match self {
            ApproximateDuration::Days(days) => format!("{} days", days),
            ApproximateDuration::Hours(hours) => format!("{} hours", hours),
            ApproximateDuration::Minutes(minutes) => format!("{} minutes", minutes),
            ApproximateDuration::Seconds(seconds) => format!("{} seconds", seconds),
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
