import argparse
from forevervm.commands.login import login

def machine_create(args):
    print("Machine create command")


def machine_list(args):
    print("Machine list command")


def machine_repl(args):
    print("Machine REPL command")


def main():
    parser = argparse.ArgumentParser(description="ForeverVM CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Login command
    login_parser = subparsers.add_parser("login", help="Log in to ForeverVM")

    # Machine commands
    machine_parser = subparsers.add_parser(
        "machine", help="Machine management commands"
    )
    machine_subparsers = machine_parser.add_subparsers(
        dest="machine_command", help="Machine commands"
    )

    # Machine create
    create_parser = machine_subparsers.add_parser("create", help="Create a new machine")

    # Machine list
    list_parser = machine_subparsers.add_parser("list", help="List all machines")

    # Machine REPL
    repl_parser = machine_subparsers.add_parser(
        "repl", help="Start a REPL session with a machine"
    )

    args = parser.parse_args()

    if args.command == "login":
        login()
    elif args.command == "machine":
        if args.machine_command == "create":
            machine_create(args)
        elif args.machine_command == "list":
            machine_list(args)
        elif args.machine_command == "repl":
            machine_repl(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
