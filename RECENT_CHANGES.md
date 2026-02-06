# Recent Changes - February 6, 2026

## Summary of Updates

### 1. Simplified Workflow Management

**Removed:**
- Visual workflow builder (node-based, complex ReactFlow interface)

**Renamed:**
- "Workflow Blueprints" → "Workflow Builder"

**Navigation Update:**
```
OLD Admin Menu:
- Workflow Blueprints (/admin/workflow-blueprints)
- Workflow Builder (/admin/workflow-builder) ← REMOVED
- Form Builder
- Settings

NEW Admin Menu:
- Workflow Builder (/admin/workflow-builder) ← Renamed from Blueprints
- Assets (/admin/assets) ← NEW
- Form Builder
- Settings
```

**What This Means:**
- The system now has a single, simple workflow template manager
- No more complex visual node-based builder
- Templates are managed through forms/tables (simpler, more maintainable)
- Route changed: `/admin/workflow-blueprints` → `/admin/workflow-builder`

### 2. Assets Admin Panel

**Created:** `/admin/assets` - Central asset management page

**Features:**
- **Stats Dashboard** - 5 stat cards showing:
  - Total assets
  - Assets in workflows
  - Assets in contacts
  - Unattached assets
  - Total storage size

- **Upload Section** - Drag & drop file uploader with validation

- **Assets List with Tabs:**
  - All assets
  - Workflows (assets attached to workflows)
  - Contacts (assets attached to contacts)
  - Unattached (orphaned assets)
  - PDF filter
  - Images filter
  - Documents filter

- **Search** - Real-time search across all assets

- **Actions:**
  - Preview (modal for images/PDFs)
  - Download
  - Delete (with confirmation)

**Why This Change:**
- Centralized asset management for admins
- Better visibility into all uploaded files
- Ability to manage orphaned/unattached assets
- Track storage usage
- Admin-only access (not embedded in every workflow detail)

## Updated File Structure

```
frontend/app/(dashboard)/admin/
├── workflow-builder/         # Renamed from workflow-blueprints
│   └── page.tsx             # Simple template manager
├── assets/                   # NEW - Asset management panel
│   └── page.tsx             # Full-featured assets admin page
├── forms/
│   └── page.tsx
└── settings/
    └── ...
```

## Updated Navigation (app-sidebar.tsx)

```typescript
const adminNavItems = [
  {
    title: "Workflow Builder",      // Was "Workflow Blueprints"
    href: "/admin/workflow-builder", // Same route as old blueprints
    icon: GitBranch,
  },
  {
    title: "Assets",                 // NEW
    href: "/admin/assets",
    icon: FileText,
  },
  {
    title: "Form Builder",
    href: "/admin/forms",
    icon: FileEdit,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
]
```

## What Was Deleted

- `/admin/workflow-builder/` directory (old visual builder)
- All visual workflow builder components
- ReactFlow dependencies (can be removed if not used elsewhere)

## What Was Renamed

- `/admin/workflow-blueprints/` → `/admin/workflow-builder/`

## What Was Created

- `/admin/assets/page.tsx` - Full admin panel for asset management
- Stats tracking functionality
- Filtering by attachment type
- Search functionality

## User-Facing Changes

### Before:
1. Admin menu had "Workflow Blueprints" and "Workflow Builder" (confusing)
2. Assets only visible within individual workflow detail dialogs
3. No way to see all assets at once
4. No way to manage unattached assets

### After:
1. Admin menu has "Workflow Builder" (clear, single purpose)
2. Assets have dedicated admin panel at `/admin/assets`
3. Can view/search/filter all assets in one place
4. Can track storage usage and manage orphaned files
5. Still can attach/view assets in workflow detail dialogs

## Migration Impact

### Routes That Changed:
- ❌ `/admin/workflow-blueprints` → ✅ `/admin/workflow-builder` (301 redirect needed)
- ❌ `/admin/workflow-builder` (old visual builder) → Removed

### Breaking Changes:
- Any bookmarks to `/admin/workflow-blueprints` will 404 (unless redirect added)
- Old visual workflow builder is inaccessible

### Non-Breaking:
- Workflow instances still work the same
- Template management UI is preserved (just renamed route)
- Asset functionality enhanced, not removed

## Testing Checklist

- [ ] Navigate to `/admin/workflow-builder` - Shows template manager
- [ ] Navigate to `/admin/assets` - Shows asset admin panel
- [ ] Upload assets via admin panel
- [ ] Filter assets by type (workflows/contacts/unattached)
- [ ] Search assets by filename
- [ ] Preview PDF and image assets
- [ ] Download assets
- [ ] Delete assets with confirmation
- [ ] Check stats cards update correctly
- [ ] Verify sidebar navigation shows correct labels
- [ ] Confirm old workflow builder route is gone

## Documentation Updates Needed

1. Update user guide to reference "Workflow Builder" not "Blueprints"
2. Document the new Assets admin panel
3. Remove any references to visual workflow builder
4. Update screenshots showing admin menu

## Next Steps (If Needed)

1. **Add 301 Redirect** for old blueprint route:
   ```typescript
   // In middleware or next.config.js
   {
     source: '/admin/workflow-blueprints',
     destination: '/admin/workflow-builder',
     permanent: true
   }
   ```

2. **Clean Up Dependencies:**
   - Check if ReactFlow is still needed
   - Remove unused workflow builder components
   - Clean up any imports

3. **Backend Integration:**
   - Connect asset upload to real storage (Vercel Blob/R2)
   - Implement delete from storage
   - Add storage quota tracking per org

4. **Access Control:**
   - Ensure `/admin/assets` is admin-only
   - Add role checks for asset deletion
   - Implement audit logging for asset changes
