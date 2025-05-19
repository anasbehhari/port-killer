# Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This helps with automatic versioning and changelog generation.

## Format

Each commit message consists of a **header**, a **body**, and a **footer**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

The **header** is mandatory and must conform to the format:
- `type`: The type of change
- `scope`: The scope of the change (optional)
- `subject`: A short description of the change

## Types

- `feat`: A new feature (triggers a minor release)
- `fix`: A bug fix (triggers a patch release)
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

## Examples

```
feat(cli): add new watch command for port monitoring

This adds a new watch command that allows users to monitor ports
and automatically kill processes that start using them.

Closes #123
```

```
fix(process): handle edge case in port range parsing

Fixes an issue where port ranges with invalid numbers would crash
the application instead of showing a proper error message.

Fixes #456
```

## Breaking Changes

To indicate a breaking change, add `BREAKING CHANGE:` in the footer:

```
feat(cli): change default port range behavior

BREAKING CHANGE: The default port range behavior now includes both
start and end ports in the range, instead of excluding the end port.
```

## Versioning

- Major version: Breaking changes
- Minor version: New features
- Patch version: Bug fixes and minor changes 