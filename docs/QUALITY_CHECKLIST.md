# Quality Checklist

## Documentation Quality

- [ ] Product value is clear in the first 10 seconds.
- [ ] Status is honest: In Development / MVP.
- [ ] README includes problem, target users, features, setup, usage, security, responsible AI, and roadmap.
- [ ] Architecture, roadmap, security, deployment, product spec, user flow, and MVP docs are current.
- [ ] Links are valid.

## Engineering Quality

- [ ] Code is modular and simple.
- [ ] Inputs are validated.
- [ ] Errors are handled clearly.
- [ ] Tests cover core workflow logic.
- [ ] Setup works from a clean checkout.

## Security Quality

- [ ] No secrets, `.env` files, private credentials, customer data, or PII are committed.
- [ ] `.env.example` contains placeholders only.
- [ ] Auth and authorization expectations are documented.
- [ ] Logs avoid private data.

## Responsible AI Quality

- [ ] Limitations are documented.
- [ ] Human review or handoff exists for sensitive workflows.
- [ ] Scores or recommendations include explanation factors where possible.
- [ ] No unsupported accuracy or production-readiness claims are made.

## Demo Quality

- [ ] Demo uses safe sample data.
- [ ] Screenshot or video placeholder is replaced when a demo exists.
- [ ] Primary workflow can be explained to a client or reviewer.
