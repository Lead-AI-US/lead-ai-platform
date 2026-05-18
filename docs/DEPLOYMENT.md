# Deployment

## Status

In Development / MVP

There may not be a deployable application yet. Do not publish fake deployment claims.

## Future Deployment Requirements

- Runtime and package manager versions.
- Exact install, development, test, build, and start commands.
- Required environment variables from `.env.example`.
- Hosting platform configuration.
- Database migration or rules deployment process, if applicable.
- Monitoring, rollback, and incident response notes.

## Environment Strategy

- `development` for local work.
- `preview` for pull requests and demos.
- `production` only after security, testing, and operational readiness reviews.

## Pre-Deployment Checklist

- [ ] No secrets or `.env` files committed.
- [ ] Setup commands verified from a clean checkout.
- [ ] Authentication and authorization reviewed.
- [ ] Logs checked for private data exposure.
- [ ] Responsible AI limitations visible where relevant.
- [ ] README and docs updated with the actual deployment flow.
