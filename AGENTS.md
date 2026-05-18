# AGENTS.md

## Project Context

This repository belongs to Lead.AI-US, an AI automation product organization founded by Arun Kumar Gharami.

Lead.AI builds AI-powered automation products for small businesses, including website chatbots, WhatsApp agents, lead capture tools, appointment automation, predictive analytics, and trustworthy AI systems.

## Coding Standards

- Keep code clean, modular, and production-oriented.
- Prefer simple, maintainable architecture.
- Use clear naming for files, functions, APIs, and components.
- Do not introduce unnecessary complexity.
- Keep documentation updated when code changes.

## Security Rules

- Never commit secrets, API keys, access tokens, private credentials, or `.env` files.
- Use `.env.example` for environment variable documentation.
- Validate all user input.
- Do not log personally identifiable information.
- Do not expose private customer data.
- Check authentication and authorization for protected routes.

## Documentation Rules

Every major repository should include:

- README.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- docs/SECURITY.md
- docs/DEPLOYMENT.md
- .env.example where applicable

## Review Guidelines

When reviewing pull requests:

- Check for security regressions.
- Check for broken setup commands.
- Check for unclear README sections.
- Check for missing environment variables.
- Check that the project status is honest: Prototype, MVP, In Development, or Production Ready.
- Suggest improvements that make the repo more professional and easier for users to understand.

## Brand Voice

Use a professional AI SaaS tone:
clear, trustworthy, practical, and business-focused.
