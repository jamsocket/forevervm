1. Bump versions:

```bash
cd scripts
npx tsx bump-versions.ts bump patch # or minor or major
```

2. Open a PR called "vX.Y.Z" where X.Y.Z is the new version

Go through the PR process and merge the PR.

3. Run the [release workflow](https://github.com/jamsocket/forevervm/actions/workflows/release.yml)

4. Complete the [draft release](https://github.com/jamsocket/forevervm/releases). Use "generate release notes" to automatically generate release notes.

5. Publish the packages:

npm:

```bash
cd javascript
npm publish
```

python:

(TODO)

rust:

```bash
cd rust
cargo install cargo-workspaces
cargo workspaces publish
```
