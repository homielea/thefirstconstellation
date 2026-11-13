const LABEL: Record<string, string> = {
  queued: "Queued", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled", blocked: "Paused",
  pending: "Waiting", ready: "Ready", awaiting_approval: "Awaiting approval", skipped: "Skipped", draft: "Draft",
};
export function Status({ s }: { s: string }) {
  return <span className="status" data-s={s}>{LABEL[s] ?? s}</span>;
}
export const statusLabel = (s: string) => LABEL[s] ?? s;
