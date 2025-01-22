from getpass import getpass
from forevervm.client import ForeverVM
from ..config import ConfigManager


def login():
    config_manager = ConfigManager()

    # Check if already logged in
    config = config_manager.load_config()
    if config and "token" in config:
        token = config["token"]
        try:
            sdk = ForeverVM(token)
            account = sdk.whoami()
            print(
                f"Already logged in as {account['account']}. Use logout to log out first if you would like to change accounts."
            )
            return
        except Exception:
            # Token might be invalid, continue with login
            pass

    # Prompt for token
    token = getpass("Enter your token: ")

    # Verify token
    try:
        sdk = ForeverVM(token)
        account = sdk.whoami()

        # Save config
        config_manager.save_config({"token": token})
        print(f"Successfully logged in as {account['account']}")
    except Exception as e:
        print(f"Login failed: {str(e)}")
