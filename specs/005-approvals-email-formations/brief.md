# 005 — Approvals, email, formations (Phase 4) — brief

Status: Draft.
- Outcome: the exact email payload is approved (hash-bound), sent once with an idempotency key, and
  audited. A changed payload needs a new approval. A completed mission is saved as a versioned
  formation and re-run with new inputs.
- Open product decision (must stop for owner input): connected Google/Microsoft mailbox via OAuth,
  or a product-managed transactional sender. This affects approval UX, scopes and cost. ADR-0006.
- Proves: ACPT-08, 09, 10, 19 (approvals/actions).
