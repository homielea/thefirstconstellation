-- 0001 foundation: identity, tenancy, agents, rooms, missions, run events, artifacts, citations.
-- Runs as the owner role. The app role (fc_app) never bypasses RLS.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Global tables (no workspace) ───────────────────────────────────────────
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_tokens_email_created ON login_tokens (email, created_at);
CREATE TABLE agent_archetypes (
  key text PRIMARY KEY CHECK (key IN ('navigator','seer','scribe','maker','weaver','keeper','sentinel')),
  version int NOT NULL,
  definition jsonb NOT NULL
);
-- Live provider spend (SEC-005). No tenant content: amounts and references only.
CREATE TABLE live_spend (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  process_session text NOT NULL,
  amount_usd numeric(12,6) NOT NULL CHECK (amount_usd >= 0),
  ref text
);

-- ── Tenant tables ───────────────────────────────────────────────────────────
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL GENERATED ALWAYS AS (id) STORED,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspace_memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','member','guest')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE TABLE agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  archetype text NOT NULL REFERENCES agent_archetypes(key),
  current_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, archetype)
);
CREATE TABLE agent_profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_profile_id uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  version int NOT NULL,
  config jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_profile_id, version)
);
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'project' CHECK (kind IN ('project','direct_agent')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pasted')),
  body text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  objective text NOT NULL,
  template_id text,
  status text NOT NULL CHECK (status IN ('draft','awaiting_plan_approval','queued','running','awaiting_approval','blocked','completed','failed','cancelled')),
  blocked_reason text,
  budget_usd numeric(10,4) NOT NULL DEFAULT 1,
  spent_usd numeric(12,6) NOT NULL DEFAULT 0,
  event_seq int NOT NULL DEFAULT 0,
  provider_mode text NOT NULL CHECK (provider_mode IN ('fake','live')),
  cancel_requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX missions_room ON missions (workspace_id, room_id, created_at DESC);
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES users(id),
  body text NOT NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mission_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mission_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  position int NOT NULL,
  title text NOT NULL,
  archetype text NOT NULL REFERENCES agent_archetypes(key),
  agent_profile_id uuid NOT NULL REFERENCES agent_profiles(id),
  agent_profile_version int NOT NULL,
  prompt_version text NOT NULL,
  depends_on text[] NOT NULL DEFAULT '{}',
  allowed_tools text[] NOT NULL DEFAULT '{}',
  expected_output jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','ready','running','awaiting_approval','completed','failed','skipped','cancelled')),
  attempt int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  lease_owner text,
  lease_expires_at timestamptz,
  last_error jsonb,
  output jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (mission_id, step_key)
);
CREATE INDEX mission_steps_claimable ON mission_steps (status, lease_expires_at);
CREATE TABLE run_events (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  seq int NOT NULL,
  type text NOT NULL,
  step_id uuid REFERENCES mission_steps(id) ON DELETE CASCADE,
  step_key text,
  agent_name text,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  diagnostic jsonb,
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, seq),
  UNIQUE (mission_id, dedupe_key)
);
CREATE TABLE model_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES mission_steps(id) ON DELETE CASCADE,
  attempt int NOT NULL,
  call_index int NOT NULL,
  provider text NOT NULL,
  provider_mode text NOT NULL,
  policy text NOT NULL,
  model_id text NOT NULL,
  prompt_version text NOT NULL,
  schema_name text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms int NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('ok','error')),
  error_category text,
  stop_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, attempt, call_index)
);
CREATE TABLE tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES mission_steps(id) ON DELETE CASCADE,
  attempt int NOT NULL,
  call_index int NOT NULL,
  tool text NOT NULL,
  input jsonb NOT NULL,
  output_summary jsonb,
  outcome text NOT NULL CHECK (outcome IN ('ok','error','refused')),
  error_category text,
  latency_ms int NOT NULL,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, attempt, call_index)
);
CREATE TABLE usage_ledger (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  step_id uuid REFERENCES mission_steps(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('model','tool')),
  execution_id uuid NOT NULL UNIQUE,
  cost_usd numeric(12,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('launch_brief','research_note','review')),
  title text NOT NULL,
  current_version int NOT NULL DEFAULT 0,
  reviews_artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version int NOT NULL,
  content jsonb NOT NULL,
  text_content text NOT NULL,
  author_kind text NOT NULL CHECK (author_kind IN ('user','agent')),
  author_user_id uuid REFERENCES users(id),
  author_agent_profile_id uuid REFERENCES agent_profiles(id),
  author_agent_version int,
  produced_by_step_id uuid UNIQUE REFERENCES mission_steps(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, version),
  CHECK ((author_kind = 'user' AND author_user_id IS NOT NULL) OR (author_kind = 'agent' AND author_agent_profile_id IS NOT NULL))
);
CREATE TABLE citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  artifact_version_id uuid NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
  ref text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('web','library')),
  url text,
  source_document_id uuid REFERENCES source_documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  retrieved_by_step_id uuid REFERENCES mission_steps(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_version_id, ref),
  CHECK ((source_kind = 'web' AND url IS NOT NULL) OR (source_kind = 'library'))
);

-- ── Row-level security ─────────────────────────────────────────────────────
CREATE FUNCTION current_workspace() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.workspace_id', true), '')::uuid $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['workspaces','workspace_memberships','agent_profiles','agent_profile_versions','rooms',
    'source_documents','missions','messages','mission_plans','mission_steps','run_events','model_executions',
    'tool_executions','usage_ledger','artifacts','artifact_versions','citations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (workspace_id = current_workspace()) WITH CHECK (workspace_id = current_workspace())', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO fc_app', t);
  END LOOP;
END $$;
-- workspace rows are created through create_workspace(); app cannot insert arbitrary workspaces.
REVOKE INSERT, DELETE ON workspaces FROM fc_app;

GRANT SELECT, INSERT, UPDATE ON users, sessions, login_tokens TO fc_app;
GRANT DELETE ON sessions TO fc_app;
GRANT SELECT ON agent_archetypes TO fc_app;
GRANT SELECT, INSERT ON live_spend TO fc_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO fc_app;

-- ── Security-definer entry points (return ids only) ────────────────────────
CREATE FUNCTION resolve_membership(p_user uuid, p_slug text)
RETURNS TABLE (workspace_id uuid, role text, workspace_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, m.role, w.name FROM workspaces w
  JOIN workspace_memberships m ON m.workspace_id = w.id AND m.user_id = p_user
  WHERE w.slug = p_slug
$$;

CREATE FUNCTION list_my_workspaces(p_user uuid)
RETURNS TABLE (slug text, name text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.slug, w.name, m.role FROM workspaces w
  JOIN workspace_memberships m ON m.workspace_id = w.id AND m.user_id = p_user
  ORDER BY w.created_at
$$;

CREATE FUNCTION create_workspace(p_user uuid, p_slug text, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid;
BEGIN
  INSERT INTO workspaces (slug, name, created_by) VALUES (p_slug, p_name, p_user) RETURNING id INTO wid;
  INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (wid, p_user, 'owner');
  RETURN wid;
END $$;

-- Claim one runnable step for a worker (ADR-0002). Ready steps, or running steps whose lease expired.
CREATE FUNCTION claim_next_step(p_worker text, p_lease_seconds int)
RETURNS TABLE (step_id uuid, mission_id uuid, workspace_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT s.id FROM mission_steps s JOIN missions m ON m.id = s.mission_id
    WHERE m.status IN ('queued','running') AND m.cancel_requested_at IS NULL
      AND (s.status = 'ready' OR (s.status = 'running' AND s.lease_expires_at < now()))
    ORDER BY s.created_at, s.position
    LIMIT 1
    FOR UPDATE OF s SKIP LOCKED
  )
  UPDATE mission_steps s
     SET status = 'running', lease_owner = p_worker,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         attempt = s.attempt + 1, started_at = coalesce(s.started_at, now())
    FROM c WHERE s.id = c.id
  RETURNING s.id, s.mission_id, s.workspace_id
$$;

-- REL-006: steps whose lease expired more than p_grace seconds ago (stuck-run detection).
CREATE FUNCTION find_stuck_steps(p_grace_seconds int)
RETURNS TABLE (step_id uuid, mission_id uuid, workspace_id uuid, lease_owner text, lease_expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.mission_id, s.workspace_id, s.lease_owner, s.lease_expires_at FROM mission_steps s
  WHERE s.status = 'running' AND s.lease_expires_at < now() - make_interval(secs => p_grace_seconds)
$$;

REVOKE ALL ON FUNCTION resolve_membership, list_my_workspaces, create_workspace, claim_next_step, find_stuck_steps FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_membership, list_my_workspaces, create_workspace, claim_next_step, find_stuck_steps, current_workspace TO fc_app;
