# Migration Summary: Applications → Workflows + Assets Module

## Completed Changes

### ✅ 1. Types Updated (`frontend/types/index.ts`)
- Renamed `Application` → `Workflow`
- Renamed `ApplicationStatus` → `WorkflowStatus`
- Added `Asset` type with full fields
- Updated `Activity` type to include `workflow_submitted` and `asset_uploaded`
- Updated `Note` and other types to use "workflow" instead of "application"
- Updated `Contact` to use `workflowsCount` instead of `applicationsCount`
- Updated `DashboardStats` to use `activeWorkflows`
- Added backward compatibility aliases for migration period

### ✅ 2. Mock Data Created
- **Created** `frontend/lib/data/workflows.ts` (copied from applications.ts and updated)
- **Created** `frontend/lib/data/assets.ts` with 8 sample assets
  - Includes helper functions: `getAssetsByWorkflow`, `getAssetsByContact`, `formatFileSize`
- **Kept** `frontend/lib/data/applications.ts` temporarily for compatibility

### ✅ 3. Routes Renamed
- **Renamed** `app/(dashboard)/applications/` → `app/(dashboard)/workflows/`
- **Renamed** `applications-content.tsx` → `workflows-content.tsx`
- **Updated** `workflows/page.tsx` to use `WorkflowsContent` and "Workflows" breadcrumb

### ✅ 4. Components Renamed
- **Renamed** `components/applications/` → `components/workflows/`
- **Renamed** component files:
  - `application-create-dialog.tsx` → `workflow-create-dialog.tsx`
  - `application-detail-dialog.tsx` → `workflow-detail-dialog.tsx`
  - `application-status-filters.tsx` → `workflow-status-filters.tsx`
- **Renamed** kanban components:
  - `application-kanban-card.tsx` → `workflow-kanban-card.tsx`
  - `applications-kanban-board.tsx` → `workflows-kanban-board.tsx`
- **Renamed** `columns/application-columns.tsx` → `columns/workflow-columns.tsx`

### ✅ 5. Assets Module Created
**Created** `components/assets/` with:
- `asset-list.tsx` - Table view with file icons, actions (preview, download, delete)
- `asset-uploader.tsx` - Drag-and-drop upload with validation and progress
- `asset-preview-modal.tsx` - Preview for images/PDFs with metadata display
- `index.ts` - Exports barrel file

### ✅ 6. Navigation Updated
- **Updated** `components/layout/app-sidebar.tsx` - Changed "Applications" to "Workflows" in navigation

## ⏳ Remaining Work (To Complete Migration)

### 1. Update workflows-content.tsx
**File**: `frontend/app/(dashboard)/workflows/workflows-content.tsx`

**Changes needed**:
- Import from `@/lib/data/workflows` instead of `applications`
- Import from `@/components/workflows/*` instead of `applications`
- Import from `@/components/kanban/workflows-kanban-board`
- Import from `@/components/data-table/columns/workflow-columns`
- Rename all function parameters and variables:
  - `applications` → `workflows`
  - `Application` → `Workflow`
  - `ApplicationStatus` → `WorkflowStatus`
  - Component name: `ApplicationsContent` → `WorkflowsContent`
- Update router.push URL from `/applications?` to `/workflows?`

### 2. Update Workflow Components
**Files to update**:
- `frontend/components/workflows/workflow-create-dialog.tsx`
- `frontend/components/workflows/workflow-detail-dialog.tsx`
- `frontend/components/workflows/workflow-status-filters.tsx`
- `frontend/components/workflows/index.ts`

**Changes**: Replace all instances of:
- `Application` → `Workflow`
- `ApplicationStatus` → `WorkflowStatus`
- `application` → `workflow` (variable names)
- Import paths to use `workflows` instead of `applications`

### 3. Update Workflow Columns
**File**: `frontend/components/data-table/columns/workflow-columns.tsx`

**Changes**:
- Rename `applicationColumns` → `workflowColumns`
- Rename `applicationStatusOptions` → `workflowStatusOptions`
- Update import from `@/lib/data/applications` → `workflows`
- Replace `Application` type → `Workflow`

### 4. Update Kanban Components
**Files**:
- `frontend/components/kanban/workflow-kanban-card.tsx`
- `frontend/components/kanban/workflows-kanban-board.tsx`

**Changes**:
- Component names and props
- Type references Application → Workflow
- Import paths

### 5. Add Assets Tab to Workflow Detail
**File**: `frontend/components/workflows/workflow-detail-dialog.tsx`

**Add new tab**:
```tsx
import { AssetList, AssetUploader, AssetPreviewModal } from "@/components/assets"
import { getAssetsByWorkflow } from "@/lib/data/assets"
import { useState } from "react"

// In the tabs:
<TabsContent value="assets">
  <div className="space-y-4">
    <AssetUploader
      workflowId={workflow.id}
      onUpload={handleAssetUpload}
    />
    <AssetList
      assets={workflowAssets}
      onPreview={handleAssetPreview}
      onDownload={handleAssetDownload}
      onDelete={handleAssetDelete}
    />
  </div>
</TabsContent>

<AssetPreviewModal
  asset={selectedAsset}
  open={previewOpen}
  onOpenChange={setPreviewOpen}
  onDownload={handleAssetDownload}
/>
```

### 6. Update Other References
Search and update any remaining files that reference:
- `applications` routing
- `Application` type imports
- Application-related data fetching

**Common locations**:
- Dashboard components
- My Work page
- Contact detail pages (workflows count)
- Activity feed
- Task components that link to workflows

### 7. Update Status Config
**File**: `frontend/lib/status-config.ts`

If it has `applicationStatusConfig`, rename to `workflowStatusConfig` and ensure it exports both names during transition.

### 8. Clean Up (After Migration Complete)
- Delete `frontend/lib/data/applications.ts`
- Remove backward compatibility type aliases from `types/index.ts`
- Update any documentation or README files

## Testing Checklist

After completing migration, test:
- [ ] Workflows page loads at `/workflows`
- [ ] Table view displays workflows correctly
- [ ] Kanban view works with drag-and-drop
- [ ] Grid view renders workflow cards
- [ ] Status filters work
- [ ] Create workflow dialog functions
- [ ] Workflow detail dialog opens
- [ ] **Assets tab appears in workflow detail**
- [ ] **Asset upload works (simulated)**
- [ ] **Asset list displays with icons**
- [ ] **Asset preview modal works for images/PDFs**
- [ ] **Asset download buttons work**
- [ ] **Asset delete confirms and removes**
- [ ] Navigation "Workflows" link works
- [ ] No console errors about missing imports
- [ ] All TypeScript types resolve correctly

## Quick Find-and-Replace Guide

For bulk updates in component files, use these replacements:

```bash
# Type names
Application → Workflow
ApplicationStatus → WorkflowStatus
ApplicationStatusFilters → WorkflowStatusFilters
ApplicationCreateDialog → WorkflowCreateDialog
ApplicationDetailDialog → WorkflowDetailDialog
ApplicationsKanbanBoard → WorkflowsKanbanBoard
ApplicationKanbanCard → WorkflowKanbanCard

# Variable names (case-sensitive)
applications → workflows
application → workflow
app → workflow (in contexts where app means application)

# Import paths
@/lib/data/applications → @/lib/data/workflows
@/components/applications → @/components/workflows
@/components/kanban/applications-kanban-board → @/components/kanban/workflows-kanban-board
@/components/kanban/application-kanban-card → @/components/kanban/workflow-kanban-card
@/components/data-table/columns/application-columns → @/components/data-table/columns/workflow-columns

# Config names
applicationStatusConfig → workflowStatusConfig
applicationColumns → workflowColumns
applicationStatusOptions → workflowStatusOptions

# URLs
/applications → /workflows
```

## New Features Added

### Assets Module
- **Upload**: Drag-and-drop or click-to-select files
- **Validation**: File type and size checks
- **Preview**: Images and PDFs can be previewed inline
- **Download**: Download any asset
- **Delete**: Confirm before deletion
- **Metadata**: Tags, descriptions, categories
- **File Info**: Upload time, user, file size
- **Associations**: Link to workflows, contacts, or tasks

### Asset Types Supported
- Documents: PDF, DOC, DOCX
- Spreadsheets: XLS, XLSX, CSV
- Images: JPG, JPEG, PNG, GIF, SVG
- Extensible for more types

## Architecture Notes

### Why Both Names Temporarily?
The types file includes backward compatibility aliases (`export type Application = Workflow`) to allow gradual migration without breaking existing code. Remove these once all references are updated.

### Assets Storage
- Mock implementation uses local URLs
- Real implementation will use Vercel Blob or Cloudflare R2
- Upload handler needs to be implemented with actual storage API
- Current `onUpload` is async and can be connected to real backend

### Data Relationships
- Assets can belong to: workflows, contacts, or tasks
- Null-safe: `workflowId?`, `contactId?`, `taskId?` are all optional
- Query helpers provided in `assets.ts` data file
