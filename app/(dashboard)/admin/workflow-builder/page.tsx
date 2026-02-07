import { PageHeader } from "@/components/layout/page-header"
import { WorkflowBuilderContent } from "./workflow-builder-content"

export default function WorkflowBlueprintsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Administration", href: "/admin/settings" },
          { label: "Workflow Blueprints" },
        ]}
      />
      <WorkflowBuilderContent />
    </>
  )
}
