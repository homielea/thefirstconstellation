# ADR-0008: Google sign-in client

Status: Proposed (2026-11-13). Needs owner decision D5 in `specs/002-constellation-onboarding/requirements.md`.

## Decision (proposed)
Implement Google sign-in as a small OpenID Connect client in `src/server/auth/google.ts`:
authorisation-code flow with PKCE, `state` and `nonce`, ID token verified with `jose` against the
issuer's published keys. It reuses the `users` and `sessions` tables and the session cookie from
ADR-0001. The issuer URL is configuration, so tests run against a local fake issuer and another
OpenID Connect provider can be added without new code paths.

## Alternatives
- Auth.js: maintained and broad, but it brings its own session and account model beside ours, and
  its database adapter would bypass `withWorkspace` conventions for the global tables.
- A hosted identity service (Clerk, Auth0, Supabase Auth): fastest, but locks sign-in and user
  records to a provider before staging hosting is decided, and adds a monthly cost.

## Consequences
We own roughly 150 lines of security-sensitive code and its tests (state, nonce, signature, issuer,
audience, expiry, unverified address). One new dependency (`jose`). No Google tokens are stored,
because the product only needs identity at sign-in; mailbox access in slice 005 is a separate
connection with its own consent and ADR.
