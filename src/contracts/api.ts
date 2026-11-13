import { z } from "zod";
import { BriefContent } from "./artifact";

export const RequestLinkRequest = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const CreateMissionRequest = z.object({
  workspaceSlug: z.string().min(1).max(64),
  roomId: z.string().uuid(),
  request: z.string().trim().min(10, "Describe the outcome in at least 10 characters.").max(4000),
});
export const SaveArtifactVersionRequest = z.object({ baseVersion: z.number().int().positive(), content: BriefContent });
export type ApiError = { error: { code: string; message: string } };
