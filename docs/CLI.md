# Lead.AI CLI

The local CLI lives at `cli/leadai.mjs`.

Run:

```bash
npm run cli -- doctor
npm run cli -- status
npm run cli -- config show
npm run cli -- workspace current
```

The CLI is not published to npm. Do not advertise global installation until an actual package exists.

`leadai doctor` reports presence checks only:

- Node version
- Git status
- `.env` / `.env.local` presence
- Firebase public config presence
- Firebase Admin config presence
- OpenAI config presence
- GitHub CLI installation
- Hugging Face CLI installation
- Kaggle CLI installation
- Build script readiness

Provider CLI installation is not the same as provider authentication or Lead.AI connection.

Secret safety:

- Secret values are never printed.
- Config output redacts key, token, secret, private, password, and credential-shaped fields.
- Provider tokens must stay server-side and must not be stored in browser-readable Firestore documents.
