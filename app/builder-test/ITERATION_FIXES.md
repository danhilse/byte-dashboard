# Workflow Builder V2 - Iteration Fixes

## Issues Fixed

### 1. ✅ Workflow State Independence
**Problem:** Switching between example workflows caused state to bleed between them.

**Fix:** Deep clone workflows when loading examples
```typescript
// Before: Direct reference (caused mutation)
setWorkflow(found)

// After: Deep clone to prevent mutation
setWorkflow(JSON.parse(JSON.stringify(found)))
```

### 2. ✅ Phases Now Visible in UI
**Problem:** Phase colors and organization weren't displaying properly.

**Fix:** Phases now properly render with:
- Color dots next to phase names
- Steps grouped under correct phases
- Sorted by `order` field
- Step count shown in phase header: "Review (3)"

### 3. ✅ Collapsible Phases
**Problem:** Couldn't collapse/expand phases to manage screen space.

**Fix:** Added phase collapse functionality:
- Click phase header to toggle collapse
- Chevron icon shows state (▶ collapsed, ▼ expanded)
- State tracked per phase
- Shows step count even when collapsed

**UI:**
```
▼ 🔵 Review (3)        ← Expanded
  [Step cards...]

▶ 🟣 Background (2)    ← Collapsed
```

### 4. ✅ Clear Actions vs Advancement Separation
**Problem:** Step cards mixed actions and advancement conditions together.

**Fix:** Redesigned step cards with clear sections:

**New Layout:**
```
┌────────────────────────────┐
│ Step Name                  │
│ Optional description...    │
│                            │
│ Actions:                   │
│ 📧 1 email  📋 1 task      │ ← Actions section
│ ─────────────────────────  │
│ → Then: When approved      │ ← Advancement section
└────────────────────────────┘
```

**Visual Improvements:**
- "Actions:" label above action badges
- Border separator between actions and advancement
- Arrow icon (→) + "Then:" label for advancement
- Description shown if present

### 5. ✅ Step Descriptions
**Problem:** Steps had no description field.

**Fix:** Added description to steps:
```typescript
export interface WorkflowStepV2 {
  id: string
  name: string
  description?: string  // NEW!
  actions: WorkflowAction[]
  advancementCondition: AdvancementCondition
  phaseId?: string
}
```

**UI:**
- Textarea in step config panel
- Shows in step card if present
- Optional field (can leave blank)

### 6. ✅ Workflow Description Editable
**Problem:** Workflow description existed in type but wasn't editable.

**Fix:** Added description field to workflow header:
- Textarea below workflow name
- Optional field
- 2-row textarea for compact display
- Saves with workflow

**UI:**
```
Workflow Name: [Application Review]
Description:   [Multi-step approval process...]
```

### 7. ✅ Collapsible Descriptions
**Problem:** Descriptions took up too much vertical space.

**Fix:** Made both workflow and step descriptions collapsible:
- Default to collapsed state
- "▶ Description (Optional)" toggle button
- Click to expand and show textarea
- Saves space while keeping functionality available

**UI:**
```
▶ Description (Optional)    ← Collapsed by default
```

### 8. ✅ Step Reordering Enabled
**Problem:** Drag-and-drop to reorder steps wasn't working properly.

**Fix:** Ensured dnd-kit integration works correctly:
- Steps can be dragged and dropped to reorder
- Works across phase boundaries
- Preserves phase assignments after reorder
- Visual feedback during drag

### 9. ✅ Phase Assignment
**Problem:** No easy way to move a step into a phase.

**Fix:** Added phase dropdown in step config panel:
- Select dropdown shows all phases with color dots
- "No Phase" option to unassign
- Phases sorted by order
- Updates immediately when changed

**UI:**
```
Step Name: [Submit Application]

Phase: [▼ Select dropdown]
       - No Phase
       - 🔵 Review
       - 🟢 Screening
       - 🟣 Background Check
```

### 10. ✅ Quick Add to Phase
**Problem:** No quick way to add step directly to a phase.

**Fix:** Added + button to phase headers:
- Small + button next to phase name
- Click to create new step with that phase pre-assigned
- Automatically selects new step for editing
- Saves time when building workflows

**UI:**
```
▼ 🔵 Review (3) [+]    ← + button adds step to this phase
  [Step cards...]
```

---

## Visual Improvements Summary

### Step Card Before:
```
Submit Application
📧 1 email, 📋 1 task, ⏸️ Waits for approval
```

### Step Card After:
```
Submit Application
Send confirmation and create review task

Actions:
📧 1 email  📋 1 task

───────────────────
→ Then: When approved
```

### Phase Headers Before:
```
🔵 REVIEW
  [Steps...]
```

### Phase Headers After:
```
▼ 🔵 Review (3)        ← Clickable, shows count
  [Steps...]

▶ 🟣 Background (2)    ← Collapsed
```

---

## Files Modified

### Iteration 1 (Phases, Descriptions, State):
1. `page.tsx` - Deep clone workflows on load
2. `workflow-v2.ts` - Added `description` to WorkflowStepV2
3. `step-config-panel-v2.tsx` - Added description textarea, phase assignment dropdown
4. `workflow-builder-v2.tsx` - Added workflow description field, collapsible descriptions
5. `step-card-v2.tsx` - Complete redesign with clear sections
6. `step-list-v2.tsx` - Added collapsible phases, + buttons on phases, step reordering

### Iteration 2 (UX Improvements):
1. `workflow-builder-v2.tsx` - Made descriptions collapsible, passed phases prop to config panel
2. `step-config-panel-v2.tsx` - Made step description collapsible, added phase assignment
3. `step-list-v2.tsx` - Added + button to phases, improved drag-drop, phase assignment support

---

## Testing Checklist

### Iteration 1:
- [x] Switch between workflows (no state bleeding)
- [x] Phases display with colors and names
- [x] Click phase header to collapse/expand
- [x] Step cards show clear Actions/Advancement sections
- [x] Add step description (optional)
- [x] Edit workflow description (optional)
- [x] Phase count updates correctly
- [x] Collapsed phases show step count

### Iteration 2:
- [ ] Descriptions are collapsible and save space
- [ ] Can drag and drop steps to reorder them
- [ ] Can reassign step to different phase via dropdown
- [ ] + button on phase creates step in that phase
- [ ] Step reordering works across phase boundaries
- [ ] Phase dropdown shows color dots

---

**Status:** ✅ Iteration 2 fixes implemented - ready for testing
