"use client"

import { useState } from "react"
import { Upload, FileSpreadsheet, ChevronRight, ChevronLeft, Check } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Contact } from "@/types"

interface CSVImportDialogProps {
  onImport: (contacts: Omit<Contact, "id" | "createdAt">[]) => void
  trigger?: React.ReactNode
}

type Step = "upload" | "mapping" | "preview" | "complete"

const targetFields = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
  { value: "addressLine1", label: "Address Line 1" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "ZIP" },
  { value: "_skip", label: "(Skip this column)" },
]

export function CSVImportDialog({ onImport, trigger }: CSVImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [isDragging, setIsDragging] = useState(false)

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split("\n")
    return lines.map((line) => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length > 0) {
        setHeaders(parsed[0])
        setCsvData(parsed.slice(1))

        const autoMapping: Record<number, string> = {}
        parsed[0].forEach((header, index) => {
          const normalized = header.toLowerCase().replace(/[^a-z]/g, "")
          if (normalized.includes("first") && normalized.includes("name")) {
            autoMapping[index] = "firstName"
          } else if (normalized.includes("last") && normalized.includes("name")) {
            autoMapping[index] = "lastName"
          } else if (normalized.includes("email")) {
            autoMapping[index] = "email"
          } else if (normalized.includes("phone")) {
            autoMapping[index] = "phone"
          } else if (normalized.includes("company") || normalized.includes("organization")) {
            autoMapping[index] = "company"
          } else if (normalized.includes("role") || normalized.includes("title") || normalized.includes("position")) {
            autoMapping[index] = "role"
          } else if (normalized.includes("status")) {
            autoMapping[index] = "status"
          } else if (normalized.includes("city")) {
            autoMapping[index] = "city"
          } else if (normalized.includes("state")) {
            autoMapping[index] = "state"
          } else if (normalized.includes("zip") || normalized.includes("postal")) {
            autoMapping[index] = "zip"
          }
        })
        setMapping(autoMapping)
        setStep("mapping")
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === "text/csv") {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const buildContacts = (): Omit<Contact, "id" | "createdAt">[] => {
    return csvData.map((row) => {
      const contact: Record<string, unknown> = {
        status: "lead" as const,
        lastContactedAt: new Date().toISOString(),
      }

      Object.entries(mapping).forEach(([indexStr, field]) => {
        if (field === "_skip") return
        const index = parseInt(indexStr)
        const value = row[index]?.trim()
        if (!value) return

        if (field === "tags") {
          contact.tags = value.split(",").map((t) => t.trim()).filter(Boolean)
        } else if (field === "status") {
          const normalized = value.toLowerCase()
          if (["active", "inactive", "lead"].includes(normalized)) {
            contact.status = normalized as Contact["status"]
          }
        } else if (field === "addressLine1") {
          contact.address = { ...(contact.address as object || {}), line1: value }
        } else if (["city", "state", "zip"].includes(field)) {
          contact.address = { ...(contact.address as object || {}), [field]: value }
        } else {
          contact[field] = value
        }
      })

      return contact as Omit<Contact, "id" | "createdAt">
    }).filter((c) => c.firstName && c.lastName && c.email)
  }

  const handleImport = () => {
    const contacts = buildContacts()
    onImport(contacts)
    setStep("complete")
  }

  const resetDialog = () => {
    setStep("upload")
    setCsvData([])
    setHeaders([])
    setMapping({})
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetDialog()
    }
  }

  const previewContacts = step === "preview" ? buildContacts().slice(0, 5) : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Upload className="mr-2 size-4" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import contacts."}
            {step === "mapping" && "Map your CSV columns to contact fields."}
            {step === "preview" && "Review the contacts that will be imported."}
            {step === "complete" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`mt-4 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById("csv-file-input")?.click()}
          >
            <FileSpreadsheet className="mb-4 size-12 text-muted-foreground" />
            <p className="mb-2 text-center text-sm font-medium">
              Drag and drop your CSV file here
            </p>
            <p className="text-center text-xs text-muted-foreground">
              or click to browse
            </p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {step === "mapping" && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-1/3 text-sm font-medium truncate" title={header}>
                    {header}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                  <Select
                    value={mapping[index] || "_skip"}
                    onValueChange={(value) =>
                      setMapping((prev) => ({ ...prev, [index]: value }))
                    }
                  >
                    <SelectTrigger className="w-2/3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="mt-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Showing first {previewContacts.length} of {buildContacts().length} valid contacts
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewContacts.map((contact, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.company || "-"}</TableCell>
                      <TableCell className="capitalize">{contact.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="mt-4 flex flex-col items-center py-8">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="size-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium">Import Successful!</p>
            <p className="text-sm text-muted-foreground">
              Your contacts have been added.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={() => setStep("preview")}>
                Preview
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={handleImport} disabled={buildContacts().length === 0}>
                Import {buildContacts().length} Contacts
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
