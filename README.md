# forevervm

CLI for foreverVM

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/forevervm.svg)](https://npmjs.org/package/forevervm)
[![Downloads/week](https://img.shields.io/npm/dw/forevervm.svg)](https://npmjs.org/package/forevervm)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g forevervm
$ forevervm COMMAND
running command...
$ forevervm (--version)
forevervm/0.0.0 darwin-arm64 node-v20.11.0
$ forevervm --help [COMMAND]
USAGE
  $ forevervm COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`forevervm hello PERSON`](#forevervm-hello-person)
- [`forevervm hello world`](#forevervm-hello-world)
- [`forevervm help [COMMAND]`](#forevervm-help-command)
- [`forevervm plugins`](#forevervm-plugins)
- [`forevervm plugins add PLUGIN`](#forevervm-plugins-add-plugin)
- [`forevervm plugins:inspect PLUGIN...`](#forevervm-pluginsinspect-plugin)
- [`forevervm plugins install PLUGIN`](#forevervm-plugins-install-plugin)
- [`forevervm plugins link PATH`](#forevervm-plugins-link-path)
- [`forevervm plugins remove [PLUGIN]`](#forevervm-plugins-remove-plugin)
- [`forevervm plugins reset`](#forevervm-plugins-reset)
- [`forevervm plugins uninstall [PLUGIN]`](#forevervm-plugins-uninstall-plugin)
- [`forevervm plugins unlink [PLUGIN]`](#forevervm-plugins-unlink-plugin)
- [`forevervm plugins update`](#forevervm-plugins-update)

## `forevervm hello PERSON`

Say hello

```
USAGE
  $ forevervm hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ forevervm hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/jamsocket/forevervm/blob/v0.0.0/src/commands/hello/index.ts)_

## `forevervm hello world`

Say hello world

```
USAGE
  $ forevervm hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ forevervm hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/jamsocket/forevervm/blob/v0.0.0/src/commands/hello/world.ts)_

## `forevervm help [COMMAND]`

Display help for forevervm.

```
USAGE
  $ forevervm help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for forevervm.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.22/src/commands/help.ts)_

## `forevervm plugins`

List installed plugins.

```
USAGE
  $ forevervm plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ forevervm plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/index.ts)_

## `forevervm plugins add PLUGIN`

Installs a plugin into forevervm.

```
USAGE
  $ forevervm plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into forevervm.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the FOREVERVM_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the FOREVERVM_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ forevervm plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ forevervm plugins add myplugin

  Install a plugin from a github url.

    $ forevervm plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ forevervm plugins add someuser/someplugin
```

## `forevervm plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ forevervm plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ forevervm plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/inspect.ts)_

## `forevervm plugins install PLUGIN`

Installs a plugin into forevervm.

```
USAGE
  $ forevervm plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into forevervm.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the FOREVERVM_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the FOREVERVM_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ forevervm plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ forevervm plugins install myplugin

  Install a plugin from a github url.

    $ forevervm plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ forevervm plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/install.ts)_

## `forevervm plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ forevervm plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ forevervm plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/link.ts)_

## `forevervm plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ forevervm plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ forevervm plugins unlink
  $ forevervm plugins remove

EXAMPLES
  $ forevervm plugins remove myplugin
```

## `forevervm plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ forevervm plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/reset.ts)_

## `forevervm plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ forevervm plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ forevervm plugins unlink
  $ forevervm plugins remove

EXAMPLES
  $ forevervm plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/uninstall.ts)_

## `forevervm plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ forevervm plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ forevervm plugins unlink
  $ forevervm plugins remove

EXAMPLES
  $ forevervm plugins unlink myplugin
```

## `forevervm plugins update`

Update installed plugins.

```
USAGE
  $ forevervm plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.26/src/commands/plugins/update.ts)_

<!-- commandsstop -->
