# ADR-0004: Web research provider

Status: Accepted (2026-11-13)

## Decision
- **Brave Search API** (owner preference) behind `SearchProvider`. The key is sent in the
  `X-Subscription-Token` header. In this cloud environment the network proxy injects it, and
  locally it is read from `BRAVE_API_KEY`.
- Fallback option: Anthropic's server-side `web_search` tool, as a second `SearchProvider`
  implementation if Brave quality or terms do not suit. Not built in Phase 0.
- **Phase 0 cites search-result title, URL and snippet only.** Fetching full pages needs open
  egress to arbitrary hosts, and that comes with SSRF hardening (allow-listing, size limits,
  content-type checks). It is deferred to slice 004.
- Search results are untrusted data. They are passed to the model in delimited blocks and can
  never change tools or plan (AGT-008).
