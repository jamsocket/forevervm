# Helper scripts

- `bump-versions.ts`: Bump the version of all packages in the project.

Usage:

`npx tsx bump-versions.ts info` prints all of the current versions in the project and whether they
match the published version.

`npx tsx bump-versions.ts bump [patch|minor|major] [--dry-run]` bumps the version of all packages in the project.
It first finds the maximum of the current versions in the project and currently published versions, and
then bumps it by the specified type.
