# Contributing to Meli MAP Backend

Thank you for your interest in contributing to **Meli MAP Backend**.

This project provides backend services for retrieving, caching, and serving vector map tiles and map font resources.

Contributions that improve reliability, security, performance, testing, documentation, and maintainability are welcome.

---

## Table of Contents

* [Code of Conduct](#code-of-conduct)
* [Before You Start](#before-you-start)
* [Ways to Contribute](#ways-to-contribute)
* [Development Environment](#development-environment)
* [Branching Strategy](#branching-strategy)
* [Coding Guidelines](#coding-guidelines)
* [API Changes](#api-changes)
* [Database Changes](#database-changes)
* [Caching Changes](#caching-changes)
* [Testing Requirements](#testing-requirements)
* [Security Requirements](#security-requirements)
* [Commit Guidelines](#commit-guidelines)
* [Pull Request Process](#pull-request-process)
* [Pull Request Checklist](#pull-request-checklist)
* [CI/CD and Quality Gates](#cicd-and-quality-gates)
* [Code Review](#code-review)
* [Documentation](#documentation)
* [License](#license)

---

## Code of Conduct

All contributors are expected to communicate respectfully and professionally.

Contributions should encourage:

* Constructive technical discussions
* Respectful code reviews
* Clear communication
* Collaborative problem solving
* A welcoming development environment

Please review the repository's [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

## Before You Start

Before beginning work:

1. Check existing Issues.
2. Check open Pull Requests.
3. Search for existing discussions related to your change.
4. Confirm that the issue is reproducible when reporting a bug.
5. For significant architectural changes, discuss the proposal with maintainers first.

For large changes, open an Issue before starting implementation.

---

## Ways to Contribute

You can contribute by:

* Fixing bugs.
* Improving API reliability.
* Adding automated tests.
* Improving database performance.
* Improving caching behavior.
* Improving error handling.
* Improving security.
* Adding request validation.
* Improving documentation.
* Improving deployment configuration.
* Improving monitoring and observability.
* Refactoring code for maintainability.

---

## Development Environment

The project requires:

* Node.js
* npm
* MySQL
* Git

Install project dependencies:

```bash
npm install
```

Configure a local MySQL database and set the required environment variables.

Start the application:

```bash
node index.js
```

The development server runs on port `3001` by default.

---

## Environment Variables

Contributors should use environment variables for configuration.

Example:

```env
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
```

Never commit:

* `.env`
* Database passwords
* API keys
* Access tokens
* Private credentials
* Production secrets

If a secret is accidentally committed, immediately notify the maintainers and rotate the affected credential.

---

## Branching Strategy

Do not commit directly to the main branch.

Create a dedicated branch for each change.

Recommended naming:

```text
feature/<description>
fix/<description>
refactor/<description>
test/<description>
docs/<description>
chore/<description>
security/<description>
performance/<description>
```

Examples:

```text
feature/tile-cache
fix/font-download
test/tile-endpoint
security/remove-hardcoded-credentials
performance/add-database-indexes
docs/api-documentation
```

Keep branches focused on one logical change.

---

## Coding Guidelines

Write simple, readable, and maintainable JavaScript.

Prefer:

* Small functions
* Clear variable names
* Explicit error handling
* Reusable utilities
* Consistent asynchronous patterns
* Parameterized database queries
* Environment-based configuration

Avoid:

* Hard-coded credentials
* Unnecessary global state
* Unhandled Promise rejections
* Duplicate logic
* Unnecessary dependencies
* Silent error handling
* Unrelated refactoring

---

## API Changes

The main API endpoints are:

```text
GET /tiles/:zoom/:x/:y
GET /fonts/:fontStack/:fontRange
```

When changing an API endpoint:

* Document the change.
* Update the README.
* Add or update tests.
* Preserve backward compatibility where possible.
* Clearly document breaking changes.

For new endpoints, document:

* HTTP method
* URL
* Parameters
* Request format
* Response format
* Status codes
* Error responses
* Caching behavior

---

## Tile Endpoint Guidelines

The tile endpoint:

```text
GET /tiles/:zoom/:x/:y
```

must preserve the expected behavior:

```text
Request
   │
   ▼
Check Cache
   │
   ├── Hit ──► Return Cached Tile
   │
   └── Miss
          │
          ▼
     Download Tile
          │
          ▼
      Store Cache
          │
          ▼
      Return Tile
```

Changes to tile retrieval should consider:

* Database query performance
* Upstream availability
* Duplicate downloads
* Invalid coordinates
* Large binary responses
* Database storage requirements
* Response latency

---

## Font Endpoint Guidelines

The font endpoint:

```text
GET /fonts/:fontStack/:fontRange
```

should follow the same cache-first approach.

Contributors should consider:

* Font stack validation
* Font range validation
* URL encoding
* Database lookup performance
* Upstream failures
* Binary response handling

---

## Database Changes

Database changes should be carefully reviewed because tile and font resources may be large binary objects.

When modifying the database:

* Document schema changes.
* Add required indexes.
* Consider existing cached data.
* Consider migration and rollback strategies.
* Avoid destructive operations without explicit approval.
* Test queries against realistic data volumes.

For tile lookups, the following fields are commonly queried together:

```text
zoom
x
y
```

For font lookups:

```text
name
font_range
```

Appropriate indexes should be considered for both lookup patterns.

---

## Caching Changes

The cache is a core part of the backend.

Any change to caching logic should consider:

* Cache hit behavior
* Cache miss behavior
* Duplicate resource downloads
* Database storage
* Upstream availability
* Concurrent requests
* Resource freshness
* Cache invalidation

A change should not unintentionally cause every request to download the resource again.

When modifying caching behavior, add tests covering both cache-hit and cache-miss scenarios.

---

## Testing Requirements

Automated testing is strongly recommended for all new functionality and bug fixes.

The current repository does not contain a dedicated automated test suite.

Contributors adding new functionality should introduce appropriate tests.

Recommended areas include:

### Tile Tests

* Cached tile is returned.
* Missing tile is downloaded.
* Downloaded tile is stored.
* Stored tile is returned.
* Database error returns `500`.
* Upstream error is handled.
* Missing tile returns `404`.

### Font Tests

* Cached font is returned.
* Missing font is downloaded.
* Downloaded font is stored.
* Stored font is returned.
* Database error returns `500`.
* Upstream error is handled.
* Missing font returns `404`.

### Connection Tests

* Initial connection succeeds.
* Initial connection failure triggers retry.
* Connection loss is handled.
* Reconnection works correctly.

---

## Test Quality

Tests should be:

* Deterministic
* Independent
* Readable
* Focused
* Repeatable

Avoid tests that depend on:

* Production databases
* External CARTO services
* Unstable network conditions
* Real production credentials

External services should be mocked in automated tests whenever possible.

---

## Security Requirements

Security is a high priority.

### Never Commit Credentials

Do not hard-code database credentials in source code.

Use environment variables instead.

### Never Commit `.env`

Local configuration must remain outside version control.

### Rotate Exposed Credentials

If credentials are exposed:

1. Immediately notify maintainers.
2. Rotate the credentials.
3. Remove them from active source code.
4. Review repository history if necessary.
5. Investigate potential unauthorized access.

### Validate Input

Validate route parameters before using them in database queries or external requests.

### Use Parameterized Queries

Always use parameterized queries for database operations.

Never construct SQL queries by directly concatenating user-controlled input.

### Restrict CORS

Avoid enabling unrestricted CORS in production unless there is a specific requirement.

### Rate Limiting

Consider rate limiting public endpoints to prevent abuse and excessive resource consumption.

---

## Error Handling

New code should handle errors explicitly.

Errors should:

* Be logged appropriately.
* Return meaningful HTTP status codes.
* Avoid exposing sensitive internal details.
* Allow the client to understand the failure.
* Avoid crashing the server.

For production environments, structured logging and centralized error monitoring are recommended.

---

## Commit Guidelines

Use clear commit messages.

Recommended format:

```text
type(scope): short description
```

Examples:

```text
feat(tiles): add tile cache endpoint
fix(fonts): handle missing font resource
test(tiles): add cache hit tests
security(config): move database credentials to environment
perf(db): add tile lookup index
refactor(api): simplify resource retrieval
docs(readme): document API endpoints
chore(deps): update dependencies
```

Recommended types:

| Type       | Purpose                 |
| ---------- | ----------------------- |
| `feat`     | New functionality       |
| `fix`      | Bug fix                 |
| `test`     | Tests                   |
| `security` | Security improvement    |
| `perf`     | Performance improvement |
| `refactor` | Code restructuring      |
| `docs`     | Documentation           |
| `chore`    | Maintenance             |
| `ci`       | CI/CD                   |

Keep commits focused and avoid unrelated changes.

---

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b fix/tile-cache
```

### 2. Implement the Change

Implement a focused solution.

### 3. Add or Update Tests

Add tests for new functionality or regression scenarios.

### 4. Run Local Validation

Install dependencies:

```bash
npm install
```

Start the application:

```bash
node index.js
```

Test affected endpoints manually when appropriate.

### 5. Review Your Changes

Check:

```bash
git status
```

Review the complete diff:

```bash
git diff
```

Make sure no sensitive information is included.

### 6. Push Your Branch

```bash
git push origin fix/tile-cache
```

### 7. Open a Pull Request

Create a Pull Request against the appropriate target branch.

---

## Pull Request Requirements

Every Pull Request should include:

### Summary

What changed?

### Motivation

Why was the change necessary?

### Implementation

How was the problem solved?

### Testing

What was tested?

### Database Changes

Were database changes introduced?

### API Changes

Were API contracts changed?

### Security Impact

Does the change affect credentials, authentication, CORS, or external requests?

### Deployment Notes

Are any environment variables or deployment changes required?

---

## Pull Request Checklist

Before requesting review:

* [ ] The change is focused.
* [ ] Existing functionality was not unintentionally broken.
* [ ] Tests were added or updated where applicable.
* [ ] Cache hit behavior was tested when caching logic changed.
* [ ] Cache miss behavior was tested when caching logic changed.
* [ ] API behavior was tested.
* [ ] Database queries use parameterized values.
* [ ] No credentials were committed.
* [ ] No `.env` files were committed.
* [ ] API documentation was updated if necessary.
* [ ] Database changes were documented.
* [ ] Security implications were considered.
* [ ] Deployment requirements were documented.
* [ ] CI checks are passing.

---

## CI/CD and Quality Gates

Pull Requests should pass all required automated checks before merging.

Recommended CI checks include:

```text
Install Dependencies
        │
        ▼
Static Validation
        │
        ▼
Automated Tests
        │
        ▼
Security Checks
        │
        ▼
Application Validation
        │
        ▼
Pull Request Review
        │
        ▼
Merge
```

Future CI workflows should verify at minimum:

* Dependencies install successfully.
* Application starts successfully.
* Automated tests pass.
* No known critical security vulnerabilities are introduced.

---

## Code Review

All Pull Requests are subject to review.

Reviewers should consider:

* Correctness
* Security
* API behavior
* Database performance
* Cache behavior
* Error handling
* Test quality
* Maintainability
* Deployment impact

Review feedback should be addressed before merging.

---

## Documentation

Documentation should be updated when changes affect:

* API endpoints
* Environment variables
* Database configuration
* Deployment
* Caching behavior
* Error responses
* Development setup

Documentation changes should be included in the same Pull Request whenever possible.

---

## Breaking Changes

Breaking changes require additional documentation.

A Pull Request introducing a breaking change should explain:

```text
Previous Behavior
New Behavior
Reason for Change
Affected Clients
Migration Steps
Deployment Requirements
```

Breaking API or database changes should be coordinated with all affected consumers.

---

## License

By contributing to this project, you agree that your contributions will be licensed under the same license that governs the repository, as specified in [`LICENSE`](LICENSE).

---

## Thank You

Thank you for contributing to Meli MAP Backend.

Whether you contribute code, tests, security improvements, documentation, performance improvements, or bug reports, your contribution helps improve the reliability and maintainability of the project.
