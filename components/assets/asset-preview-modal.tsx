"use client"

import { Asset } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AssetPreviewModalProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload?: (asset: Asset) => void
}

export function AssetPreviewModal({
  asset,
  open,
  onOpenChange,
  onDownload,
}: AssetPreviewModalProps) {
  if (!asset) return null

  const isImage = ["jpg", "jpeg", "png", "gif", "svg"].includes(asset.fileType.toLowerCase())
  const isPdf = asset.fileType.toLowerCase() === "pdf"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{asset.fileName}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{asset.fileType.toUpperCase()}</Badge>
                {asset.metadata?.category && (
                  <Badge variant="secondary">{asset.metadata.category}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(asset)}
                >
                  <Download className="size-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={asset.storageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4 mr-2" />
                  Open
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isImage ? (
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
              <img
                src={asset.storageUrl}
                alt={asset.fileName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[60vh] bg-muted/50 rounded-lg overflow-hidden">
              <iframe
                src={asset.storageUrl}
                className="w-full h-full"
                title={asset.fileName}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/50 rounded-lg">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Preview not available for this file type
                </p>
                <Button
                  variant="outline"
                  onClick={() => onDownload?.(asset)}
                >
                  <Download className="size-4 mr-2" />
                  Download to view
                </Button>
              </div>
            </div>
          )}

          {asset.metadata?.description && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{asset.metadata.description}</p>
            </div>
          )}

          {asset.metadata?.tags && asset.metadata.tags.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {asset.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded by:</span>
              <span className="font-medium">{asset.uploadedByName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded at:</span>
              <span className="font-medium">
                {new Date(asset.uploadedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File size:</span>
              <span className="font-medium">
                {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
