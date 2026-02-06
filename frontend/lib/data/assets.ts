import type { Asset } from "@/types"

export const assets: Asset[] = [
  {
    id: "asset1",
    fileName: "contract_draft_v2.pdf",
    fileSize: 2458624, // ~2.4 MB
    fileType: "pdf",
    mimeType: "application/pdf",
    workflowId: "w1",
    storageUrl: "https://example.com/assets/contract_draft_v2.pdf",
    uploadedBy: "user1",
    uploadedByName: "Sarah Chen",
    uploadedAt: "2024-01-28T14:30:00Z",
    metadata: {
      description: "Updated contract with legal review comments",
      tags: ["contract", "legal"],
      category: "document",
    },
  },
  {
    id: "asset2",
    fileName: "company_logo.png",
    fileSize: 145920, // ~142 KB
    fileType: "png",
    mimeType: "image/png",
    workflowId: "w1",
    storageUrl: "https://example.com/assets/company_logo.png",
    uploadedBy: "user1",
    uploadedByName: "Sarah Chen",
    uploadedAt: "2024-01-29T09:15:00Z",
    metadata: {
      description: "Company branding assets",
      tags: ["branding", "logo"],
      category: "image",
    },
  },
  {
    id: "asset3",
    fileName: "partnership_proposal.docx",
    fileSize: 1048576, // 1 MB
    fileType: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    workflowId: "w2",
    storageUrl: "https://example.com/assets/partnership_proposal.docx",
    uploadedBy: "user2",
    uploadedByName: "Michael Rodriguez",
    uploadedAt: "2024-02-01T16:00:00Z",
    metadata: {
      description: "Initial partnership proposal document",
      tags: ["proposal", "partnership"],
      category: "document",
    },
  },
  {
    id: "asset4",
    fileName: "id_verification.jpg",
    fileSize: 524288, // 512 KB
    fileType: "jpg",
    mimeType: "image/jpeg",
    contactId: "c1",
    storageUrl: "https://example.com/assets/id_verification.jpg",
    uploadedBy: "user1",
    uploadedByName: "Sarah Chen",
    uploadedAt: "2024-01-27T11:00:00Z",
    metadata: {
      description: "Government-issued ID for verification",
      tags: ["verification", "identity"],
      category: "identification",
    },
  },
  {
    id: "asset5",
    fileName: "signed_agreement.pdf",
    fileSize: 3145728, // 3 MB
    fileType: "pdf",
    mimeType: "application/pdf",
    workflowId: "w4",
    storageUrl: "https://example.com/assets/signed_agreement.pdf",
    uploadedBy: "user3",
    uploadedByName: "James Park",
    uploadedAt: "2024-01-22T14:30:00Z",
    metadata: {
      description: "Fully executed subscription agreement",
      tags: ["signed", "contract", "final"],
      category: "document",
    },
  },
  {
    id: "asset6",
    fileName: "technical_requirements.pdf",
    fileSize: 987654, // ~964 KB
    fileType: "pdf",
    mimeType: "application/pdf",
    workflowId: "w5",
    storageUrl: "https://example.com/assets/technical_requirements.pdf",
    uploadedBy: "user4",
    uploadedByName: "Amanda Foster",
    uploadedAt: "2024-01-20T15:45:00Z",
    metadata: {
      description: "Technical specification document for custom development",
      tags: ["technical", "requirements", "specs"],
      category: "document",
    },
  },
  {
    id: "asset7",
    fileName: "proof_of_payment.png",
    fileSize: 245760, // ~240 KB
    fileType: "png",
    mimeType: "image/png",
    workflowId: "w4",
    storageUrl: "https://example.com/assets/proof_of_payment.png",
    uploadedBy: "user3",
    uploadedByName: "James Park",
    uploadedAt: "2024-01-20T10:00:00Z",
    metadata: {
      description: "Payment confirmation screenshot",
      tags: ["payment", "receipt"],
      category: "financial",
    },
  },
  {
    id: "asset8",
    fileName: "background_check_results.pdf",
    fileSize: 1572864, // ~1.5 MB
    fileType: "pdf",
    mimeType: "application/pdf",
    contactId: "c2",
    storageUrl: "https://example.com/assets/background_check_results.pdf",
    uploadedBy: "admin1",
    uploadedByName: "Admin User",
    uploadedAt: "2024-01-25T13:20:00Z",
    metadata: {
      description: "Background verification report",
      tags: ["background-check", "verification", "confidential"],
      category: "verification",
    },
  },
]

export function getAssetById(id: string): Asset | undefined {
  return assets.find((a) => a.id === id)
}

export function getAssetsByWorkflow(workflowId: string): Asset[] {
  return assets.filter((a) => a.workflowId === workflowId)
}

export function getAssetsByContact(contactId: string): Asset[] {
  return assets.filter((a) => a.contactId === contactId)
}

export function getAssetsByTask(taskId: string): Asset[] {
  return assets.filter((a) => a.taskId === taskId)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}
