export interface WorkflowEmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export interface OrganizationWorkflowEmailSettings {
  allowedFromEmails: string[]
  defaultFromEmail: string | null
  templates: WorkflowEmailTemplate[]
}
