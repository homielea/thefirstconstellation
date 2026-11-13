DROP FUNCTION IF EXISTS find_stuck_steps, claim_next_step, create_workspace, list_my_workspaces, resolve_membership;
DROP TABLE IF EXISTS citations, artifact_versions, artifacts, usage_ledger, tool_executions, model_executions,
  run_events, mission_steps, mission_plans, messages, missions, source_documents, rooms,
  agent_profile_versions, agent_profiles, workspace_memberships, workspaces, live_spend,
  agent_archetypes, login_tokens, sessions, users CASCADE;
DROP FUNCTION IF EXISTS current_workspace;
