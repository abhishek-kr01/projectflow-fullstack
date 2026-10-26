import test from "node:test";
import assert from "node:assert/strict";
import { assertTaskUpdateAllowed } from "../src/services/task-policy.service.js";
import { UserRolesEnum } from "../src/utils/constants.js";

test("project members may transition any task status but cannot edit task metadata", () => {
  assert.doesNotThrow(() => assertTaskUpdateAllowed(UserRolesEnum.MEMBER, { status: "in_progress" }));
  assert.throws(() => assertTaskUpdateAllowed(UserRolesEnum.MEMBER, { title: "Change title" }), /only update a task's status/i);
  assert.throws(() => assertTaskUpdateAllowed(UserRolesEnum.MEMBER, { status: "done", assignedTo: "507f1f77bcf86cd799439011" }), /only update a task's status/i);
  assert.throws(() => assertTaskUpdateAllowed(UserRolesEnum.MEMBER, { status: "blocked" }), /Status must be/i);
});

test("project admins and admins may update task metadata", () => {
  assert.doesNotThrow(() => assertTaskUpdateAllowed(UserRolesEnum.PROJECT_ADMIN, { title: "Updated", status: "done" }));
  assert.doesNotThrow(() => assertTaskUpdateAllowed(UserRolesEnum.ADMIN, { assignedTo: "507f1f77bcf86cd799439011" }));
});
