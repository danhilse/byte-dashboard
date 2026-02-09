"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { AssetList, AssetUploader, AssetPreviewModal } from "@/components/assets"
import { assets as mockAssets } from "@/lib/data/assets"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { Asset } from "@/types"

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>(mockAssets)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("all")

  const handleAssetUpload = async (files: File[]) => {
    // Simulate upload - in real app, this would upload to Vercel Blob/R2
    console.log("Uploading files:", files)

    const newAssets: Asset[] = files.map((file, index) => ({
      id: `asset-${Date.now()}-${index}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.name.split(".").pop() || "unknown",
      mimeType: file.type,
      storageUrl: URL.createObjectURL(file), // Mock URL
      uploadedBy: "current-user-id",
      uploadedByName: "Current User",
      uploadedAt: new Date().toISOString(),
      metadata: {
        description: "",
        tags: [],
        category: "document",
      },
    }))

    setAssets((prev) => [...newAssets, ...prev])
  }

  const handleAssetPreview = (asset: Asset) => {
    setSelectedAsset(asset)
    setPreviewOpen(true)
  }

  const handleAssetDownload = (asset: Asset) => {
    // In real app, this would download from storage
    window.open(asset.storageUrl, "_blank")
  }

  const handleAssetDelete = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.fileName.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "all") return matchesSearch

    if (activeTab === "workflows") return matchesSearch && asset.workflowExecutionId
    if (activeTab === "contacts") return matchesSearch && asset.contactId && !asset.workflowExecutionId
    if (activeTab === "unattached") return matchesSearch && !asset.workflowExecutionId && !asset.contactId

    // Filter by file type
    return matchesSearch && asset.fileType.toLowerCase() === activeTab
  })

  const getAssetStats = () => {
    const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0)
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)

    return {
      total: assets.length,
      workflows: assets.filter((a) => a.workflowExecutionId).length,
      contacts: assets.filter((a) => a.contactId && !a.workflowExecutionId).length,
      unattached: assets.filter((a) => !a.workflowExecutionId && !a.contactId).length,
      totalSize: totalSizeMB,
    }
  }

  const stats = getAssetStats()

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/settings" },
          { label: "Assets" }
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">
              Manage documents, images, and files across all workflows and contacts
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assets</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Workflows</CardDescription>
              <CardTitle className="text-2xl">{stats.workflows}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Contacts</CardDescription>
              <CardTitle className="text-2xl">{stats.contacts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unattached</CardDescription>
              <CardTitle className="text-2xl">{stats.unattached}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Size</CardDescription>
              <CardTitle className="text-2xl">{stats.totalSize} MB</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Upload Section */}
        <AssetUploader onUpload={handleAssetUpload} />

        {/* Assets List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Assets</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({assets.length})</TabsTrigger>
                <TabsTrigger value="workflows">Workflows ({stats.workflows})</TabsTrigger>
                <TabsTrigger value="contacts">Contacts ({stats.contacts})</TabsTrigger>
                <TabsTrigger value="unattached">Unattached ({stats.unattached})</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="jpg">Images</TabsTrigger>
                <TabsTrigger value="docx">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <AssetList
                  assets={filteredAssets}
                  onPreview={handleAssetPreview}
                  onDownload={handleAssetDownload}
                  onDelete={handleAssetDelete}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AssetPreviewModal
        asset={selectedAsset}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDownload={handleAssetDownload}
      />
    </>
  )
}
