import { ApiError } from "../utils/api-error.js";
import { AvailableTaskStatuses, UserRolesEnum } from "../utils/constants.js";

/** Enforce the member-level task transition policy independently from persistence. */
export function assertTaskUpdateAllowed(role: string | undefined, body: Record<string, unknown>): void {
  if (role !== UserRolesEnum.MEMBER) return;

  const submittedFields = Object.keys(body);
  if (submittedFields.length !== 1 || submittedFields[0] !== "status" || body.status === undefined) {
    throw new ApiError(403, "Project members can only update a task's status.");
  }
  if (!(AvailableTaskStatuses as string[]).includes(String(body.status))) {
    throw new ApiError(400, "Status must be todo, in_progress, or done.");
  }
}
