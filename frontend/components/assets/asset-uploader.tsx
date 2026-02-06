"use client"

import { useCallback, useState } from "react"
import { Upload, X, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface AssetUploaderProps {
  workflowId?: string
  contactId?: string
  taskId?: string
  maxSize?: number // in bytes
  allowedTypes?: string[]
  onUpload?: (files: File[]) => Promise<void>
}

export function AssetUploader({
  workflowId,
  contactId,
  taskId,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif"],
  onUpload,
}: AssetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return `File type .${fileExtension} is not allowed`
    }
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
    }
    return null
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const validFiles: File[] = []
      const errors: string[] = []

      files.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          errors.push(`${file.name}: ${error}`)
        } else {
          validFiles.push(file)
        }
      })

      if (errors.length > 0) {
        alert(errors.join("\n"))
      }

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles])
      }
    },
    [maxSize, allowedTypes]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    const validFiles: File[] = []
    const errors: string[] = []

    files.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      alert(errors.join("\n"))
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !onUpload) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await onUpload(selectedFiles)

      clearInterval(interval)
      setUploadProgress(100)

      // Clear files after successful upload
      setTimeout(() => {
        setSelectedFiles([])
        setUploadProgress(0)
        setUploading(false)
      }, 500)
    } catch (error) {
      console.error("Upload failed:", error)
      setUploading(false)
      setUploadProgress(0)
      alert("Upload failed. Please try again.")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "p-8 border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Upload className={cn("size-12", isDragging ? "text-primary" : "text-muted-foreground")} />
          <div>
            <h3 className="text-lg font-semibold">Upload Assets</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Allowed: {allowedTypes.join(", ")} (Max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </div>
          <Button variant="outline" onClick={() => document.getElementById("file-input")?.click()}>
            Select Files
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            accept={allowedTypes.map((type) => `.${type}`).join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Selected Files ({selectedFiles.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload All"}
              </Button>
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="size-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
