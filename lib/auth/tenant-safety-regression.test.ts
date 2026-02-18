/** @vitest-environment node */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("tenant safety regressions", () => {
  it("requires membership-backed page auth on dashboard/admin pages", () => {
    const dashboardPage = readWorkspaceFile("app/(dashboard)/dashboard/page.tsx");
    expect(dashboardPage).toContain("requirePageAuth");
    expect(dashboardPage).toContain('requiredPermission: "dashboard.read"');
    expect(dashboardPage).not.toContain("await auth()");

    const workflowBuilderIndexPage = readWorkspaceFile(
      "app/(dashboard)/admin/workflow-builder/page.tsx"
    );
    expect(workflowBuilderIndexPage).toContain("requirePageAuth");
    expect(workflowBuilderIndexPage).toContain(
      'requiredPermission: "workflow-definitions.read_full"'
    );
    expect(workflowBuilderIndexPage).not.toContain("await auth()");

    const workflowBuilderEditorPage = readWorkspaceFile(
      "app/(dashboard)/admin/workflow-builder/[id]/page.tsx"
    );
    expect(workflowBuilderEditorPage).toContain("requirePageAuth");
    expect(workflowBuilderEditorPage).toContain(
      'requiredPermission: "workflow-definitions.read_full"'
    );
    expect(workflowBuilderEditorPage).not.toContain("await auth()");
  });

  it("keeps task contact joins org-scoped", () => {
    const tasksRoute = readWorkspaceFile("app/api/tasks/route.ts");
    expect(tasksRoute).toMatch(
      /leftJoin\(\s*contacts,\s*and\(\s*eq\(tasks\.contactId,\s*contacts\.id\),\s*eq\(contacts\.orgId,\s*orgId\)\s*\)\s*\)/s
    );

    const taskByIdRoute = readWorkspaceFile("app/api/tasks/[id]/route.ts");
    expect(taskByIdRoute).toMatch(
      /leftJoin\(\s*contacts,\s*and\(\s*eq\(tasks\.contactId,\s*contacts\.id\),\s*eq\(contacts\.orgId,\s*orgId\)\s*\)\s*\)/s
    );
  });

  it("keeps recent workflow joins org-scoped", () => {
    const queries = readWorkspaceFile("lib/db/queries.ts");
    expect(queries).toMatch(
      /leftJoin\(\s*contacts,\s*and\(\s*eq\(workflowExecutions\.contactId,\s*contacts\.id\),\s*eq\(contacts\.orgId,\s*orgId\)\s*\)\s*\)/s
    );
    expect(queries).toMatch(
      /leftJoin\(\s*workflowDefinitions,\s*and\(\s*eq\(workflowExecutions\.workflowDefinitionId,\s*workflowDefinitions\.id\),\s*eq\(workflowDefinitions\.orgId,\s*orgId\)\s*\)\s*\)/s
    );
  });

  it("does not treat legacy users org/role fields as update authority", () => {
    const usersService = readWorkspaceFile("lib/users/service.ts");
    const match = usersService.match(
      /insert\(users\)[\s\S]*?onConflictDoUpdate\(\{\s*target:\s*users\.id,\s*set:\s*\{([\s\S]*?)\n\s*\},\s*\}\);/
    );
    expect(match).toBeTruthy();

    const updateSetBody = match?.[1] ?? "";
    expect(updateSetBody).not.toMatch(/\borgId:/);
    expect(updateSetBody).not.toMatch(/\brole:/);
    expect(updateSetBody).not.toMatch(/\broles:/);
  });
});
