# Product Pro Integration

Product Pro v2 layers professional SaaS UX onto the real Lead.AI foundation merged in PR #7.

Preserved foundation:

- Firebase Auth
- Firebase Admin
- Firestore data model and security rules
- Workspace membership authorization
- Tenant isolation by `workspaceId`
- OpenAI server adapter and orchestration
- Leads, knowledge, conversation, analytics APIs
- Vercel routes and CI

Integrated Product Pro surfaces:

- Grouped sidebar navigation
- Sticky workspace header
- Command palette with `Cmd/Ctrl + K`
- Dashboard attention panel
- Leads search and status filters
- Conversation priority layout
- Knowledge status tabs and accessible form labels
- Analytics range and funnel polish
- AI Agent control center
- Integrations page
- AI Assets hub
- Developer Center
- Local `leadai` CLI

External providers are contract-ready only. GitHub, Hugging Face, and Kaggle remain `Not Configured` until server-side authorization, encrypted token storage, and metadata sync are implemented.
