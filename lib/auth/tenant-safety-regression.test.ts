/** @vitest-environment node */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function listSourceFiles(path: string): string[] {
  const absolutePath = join(process.cwd(), path);
  const entries = readdirSync(absolutePath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = join(path, entry.name);

    if (entry.isDirectory()) {
      if (relativePath === "lib/db/migrations") {
        continue;
      }
      files.push(...listSourceFiles(relativePath));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    if (relativePath === "lib/db/schema.ts") {
      continue;
    }

    files.push(relativePath);
  }

  return files;
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

  it("removes legacy users org/role columns from schema", () => {
    const schema = readWorkspaceFile("lib/db/schema.ts");
    const usersTableMatch = schema.match(
      /export const users = pgTable\(\s*"users",\s*\{([\s\S]*?)\}\s*,\s*\(\)\s*=>\s*\(\{\}\)\s*\);/
    );
    expect(usersTableMatch).toBeTruthy();

    const usersTableBody = usersTableMatch?.[1] ?? "";
    expect(usersTableBody).not.toContain('text("org_id")');
    expect(usersTableBody).not.toContain('text("role")');
    expect(usersTableBody).not.toContain('text("roles")');
  });

  it("does not read legacy users org/role columns in runtime code", () => {
    const sourceFiles = [...listSourceFiles("app"), ...listSourceFiles("lib")];
    const forbiddenPatterns = [/users\.orgId\b/, /users\.role\b/, /users\.roles\b/];
    const offenders: string[] = [];

    for (const sourceFile of sourceFiles) {
      const contents = readWorkspaceFile(sourceFile);
      if (forbiddenPatterns.some((pattern) => pattern.test(contents))) {
        offenders.push(sourceFile);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps activity and notes actor joins membership-scoped", () => {
    const activityRoute = readWorkspaceFile("app/api/activity/route.ts");
    expect(activityRoute).toMatch(
      /leftJoin\(\s*organizationMemberships,\s*and\(\s*eq\(organizationMemberships\.orgId,\s*activityLog\.orgId\),\s*eq\(organizationMemberships\.userId,\s*activityLog\.userId\)\s*\)\s*\)/s
    );
    expect(activityRoute).toMatch(
      /leftJoin\(\s*users,\s*eq\(organizationMemberships\.userId,\s*users\.id\)\s*\)/s
    );

    const notesRoute = readWorkspaceFile("app/api/notes/route.ts");
    expect(notesRoute).toMatch(
      /leftJoin\(\s*organizationMemberships,\s*and\(\s*eq\(organizationMemberships\.orgId,\s*notes\.orgId\),\s*eq\(organizationMemberships\.userId,\s*notes\.userId\)\s*\)\s*\)/s
    );
    expect(notesRoute).toMatch(
      /innerJoin\(\s*users,\s*eq\(users\.id,\s*organizationMemberships\.userId\)\s*\)/s
    );
  });

  it("keeps workflow lookups org-scoped in execution routes", () => {
    const workflowTriggerRoute = readWorkspaceFile("app/api/workflows/trigger/route.ts");
    expect(workflowTriggerRoute).toMatch(
      /where\(\s*and\(\s*eq\(contacts\.id,\s*contactId\),\s*eq\(contacts\.orgId,\s*orgId\)\s*\)\s*\)/s
    );
    expect(workflowTriggerRoute).toMatch(
      /where\(\s*and\(\s*eq\(workflowDefinitions\.id,\s*workflowDefinitionId\),\s*eq\(workflowDefinitions\.orgId,\s*orgId\)\s*\)\s*\)/s
    );

    const workflowByIdRoute = readWorkspaceFile("app/api/workflows/[id]/route.ts");
    expect(workflowByIdRoute).toMatch(
      /where\(\s*and\(\s*eq\(workflowExecutions\.id,\s*id\),\s*eq\(workflowExecutions\.orgId,\s*orgId\)\s*\)\s*\)/s
    );
  });
});
