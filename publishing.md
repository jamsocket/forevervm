1. Bump versions:

```bash
npm --prefix scripts i
npm --prefix scripts run bump patch # or minor or major
```

2. Open a PR called "vX.Y.Z" where X.Y.Z is the new version

Go through the PR process and merge the PR.

3. Run the [release workflow](https://github.com/jamsocket/forevervm/actions/workflows/release.yml)

As the release version, put `vX.Y.Z` where X.Y.Z is the new version. (Note the leading `v`)

4. Complete the [draft release](https://github.com/jamsocket/forevervm/releases). Use "generate release notes" to automatically generate release notes.

5. Publish the packages:

npm:

```bash
cd javascript/forevervm
npm publish
```

```bash
cd javascript/sdk
npm publish
```

python:

When prompted for a username, enter `__token__` (you will need a token to publish).

```bash
cd python/forevervm
rm -rf dist
uv build
uv publish
```

```bash
cd python/sdk
rm -rf dist
uv build
uv publish
```

rust:

```bash
cd rust
cargo install cargo-workspaces
cargo workspaces publish --from-git
```
