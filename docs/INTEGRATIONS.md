# Integrations

The Product Pro integration UI tracks provider readiness without claiming live external connectivity.

Current providers:

- Firebase
- OpenAI
- Website Widget
- GitHub
- Hugging Face
- Kaggle

Current implementation:

- Firebase client status is inferred from app configuration.
- Website Widget status is inferred from workspace allowed origins.
- OpenAI status is unknown from the browser and must be verified server-side.
- GitHub, Hugging Face, and Kaggle are `Not Configured`.

Future provider credentials must be stored server-side, encrypted or managed by infrastructure, and never returned to browser code.
