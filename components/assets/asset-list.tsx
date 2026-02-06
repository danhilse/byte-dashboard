"use client"

import { useState } from "react"
import { FileText, Download, Trash2, Eye, File, Image, FileSpreadsheet } from "lucide-react"
import { Asset } from "@/types"
import { formatFileSize } from "@/lib/data/assets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface AssetListProps {
  assets: Asset[]
  onPreview?: (asset: Asset) => void
  onDownload?: (asset: Asset) => void
  onDelete?: (assetId: string) => void
}

function getFileIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return <FileText className="size-4 text-red-500" />
    case "doc":
    case "docx":
      return <FileText className="size-4 text-blue-500" />
    case "xls":
    case "xlsx":
    case "csv":
      return <FileSpreadsheet className="size-4 text-green-500" />
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
      return <Image className="size-4 text-purple-500" />
    default:
      return <File className="size-4 text-gray-500" />
  }
}

export function AssetList({ assets, onPreview, onDownload, onDelete }: AssetListProps) {
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null)

  const handleDelete = () => {
    if (deleteAssetId && onDelete) {
      onDelete(deleteAssetId)
      setDeleteAssetId(null)
    }
  }

  if (assets.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <FileText className="size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No assets uploaded</h3>
          <p className="text-sm text-muted-foreground">
            Upload documents, images, or other files to get started.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Uploaded At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {getFileIcon(asset.fileType)}
                    <span className="truncate max-w-xs">{asset.fileName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{asset.fileType.toUpperCase()}</Badge>
                </TableCell>
                <TableCell>{formatFileSize(asset.fileSize)}</TableCell>
                <TableCell>{asset.uploadedByName}</TableCell>
                <TableCell>
                  {new Date(asset.uploadedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPreview(asset)}
                        title="Preview"
                      >
                        <Eye className="size-4" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDownload(asset)}
                        title="Download"
                      >
                        <Download className="size-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteAssetId(asset.id)}
                        title="Delete"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteAssetId !== null} onOpenChange={(open) => !open && setDeleteAssetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
