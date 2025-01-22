import os
import json
from typing import TypedDict


class CliConfig(TypedDict):
    token: str


class ConfigManager:
    def __init__(self):
        self.config_dir = os.path.expanduser("~/.config/forevervm")
        self.config_file = os.path.join(self.config_dir, "config.json")
        os.makedirs(self.config_dir, exist_ok=True)

    def load_config(self) -> CliConfig | None:
        try:
            with open(self.config_file, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def save_config(self, config: CliConfig):
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, "w") as f:
            json.dump(config, f)
