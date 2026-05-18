# Security

## Status

Planned

Security controls must be reviewed again when application code is added.

## Requirements

- Do not commit secrets, API keys, access tokens, `.env` files, or customer exports.
- Document required configuration in `.env.example`.
- Validate all API inputs.
- Do not log personally identifiable information or private customer data.
- Scope all protected data by authenticated user, organization, and role.
- Review AI workflows for data access boundaries and human handoff paths.

## Reporting

Report security concerns privately to the maintainer before public disclosure.
