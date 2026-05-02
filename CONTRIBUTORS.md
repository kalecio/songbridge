# Contributing to Songbridge

Thank you for your interest in contributing. This document covers everything you need to get started.

## Ways to Contribute

- Reporting bugs via a [bug report issue](https://github.com/absolutego/songbridge/issues/new?template=bug_report.md)
- Suggesting features via a [feature request issue](https://github.com/absolutego/songbridge/issues/new?template=feature_request.md)
- Fixing bugs or implementing features via a pull request
- Improving documentation

## Getting Started

1. Fork the repository and create your branch from `main`:
   ```sh
   git checkout -b feat/your-feature-name
   ```
2. Follow the setup steps in the [README](./README.md#development).
3. Make your changes, ensuring all checks pass (see below).
4. Open a pull request against `main`.

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/equalizer` |
| Bug fix | `fix/<short-description>` | `fix/seek-on-flac` |
| Refactor | `refactor/<short-description>` | `refactor/audio-state` |
| Documentation | `docs/<short-description>` | `docs/readme-update` |

## Commit Style

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`.

Examples:
```
feat(playlist): add drag-and-drop reordering
fix(audio): prevent double-play on rapid seek
```

## Checks Before Opening a PR

Make sure all of the following pass locally:

```sh
# Frontend
npm run lint
npm test

# Rust
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Pre-commit hooks run `fmt`, `check`, and `test` automatically if you have [Husky](https://typicode.github.io/husky/) set up (installed via `npm install`).

## Pull Request Guidelines

- Keep PRs focused: one feature or fix per PR.
- Reference the related issue in the PR description (e.g. `Closes #42`).
- Add or update tests for any changed behaviour.
- Do not bump the version in `Cargo.toml` / `package.json` — maintainers handle releases.

## Code Style

- **TypeScript/React:** ESLint and Prettier enforce style automatically. Run `npm run lint:fix` and `npm run format` before committing.
- **Rust:** `rustfmt` and `clippy` are required to pass with no warnings.
- Comments should explain *why*, not *what*. Well-named identifiers carry the what.

## Reporting Security Vulnerabilities

Please **do not** open a public issue for security vulnerabilities. Instead, contact the maintainers directly via Discord or email before disclosing publicly.

## License

By contributing you agree that your contributions will be licensed under the same [CC BY-NC-SA 4.0](./LICENSE) license as the rest of the project.
