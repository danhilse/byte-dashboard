# Variable System - Complete Implementation

## Overview

Replaced text-based variable templating (`{{contact.email}}`) with a type-aware, context-sensitive variable system using combobox selectors.

---

## ✅ What's Implemented

### 1. Type System (`types/workflow-v2.ts`)

**New Types:**
```typescript
// Data types for filtering
type VariableDataType = "email" | "text" | "number" | "date" | "boolean" | "user"

// Variable categories
type VariableType = "contact" | "user" | "task" | "form_submission" | "custom"

// Variable definition
interface WorkflowVariable {
  id: string                    // e.g., "var-contact"
  name: string                  // e.g., "Contact"
  type: VariableType
  dataType?: VariableDataType   // For simple variables
  source: VariableSource
  fields?: WorkflowVariableField[]  // For complex variables
  readOnly?: boolean            // Auto-detected can't be edited
}

// Field within complex variable
interface WorkflowVariableField {
  key: string                   // e.g., "email"
  label: string                 // e.g., "Email"
  dataType: VariableDataType
}
```

**Updated:**
- `WorkflowDefinitionV2.variables` changed from `Record<string, unknown>` to `WorkflowVariable[]`

---

### 2. Auto-Detection (`lib/workflow-builder-v2/variable-utils.ts`)

**Functions:**

- **`detectVariables(workflow)`** - Scans trigger and actions to auto-detect variables
- **`getAllVariables(workflow)`** - Merges auto-detected + custom variables
- **`filterVariablesByDataType(variables, dataType)`** - Context-aware filtering
- **`formatVariableRef(variableId, fieldKey?)`** - Creates reference like `"var-contact.email"`
- **`parseVariableRef(ref)`** - Parses reference back to `{ variableId, fieldKey }`
- **`getVariableLabel(ref, variables)`** - Display label like "Contact → Email"

**Auto-Detection Rules:**

| Trigger Type | Variables Created |
|--------------|-------------------|
| `manual`, `contact_status`, `api` | `var-contact` (email, firstName, lastName, phone, company) |
| `form_submission` | `var-contact` + `var-form-submission` (submittedAt, form fields) |

| Action Type | Variables Created |
|-------------|-------------------|
| `create_task` | `var-task-{actionId}` (assignedTo, status, outcome, completedAt) |
| `create_contact` | `var-contact-{actionId}` (email, firstName, lastName, phone) |

---

### 3. Variable Selector (`components/variable-selector.tsx`)

**Combobox Component with:**

- **Search** - Filter variables by name
- **Grouped display** - "From Trigger", "From Actions", "Custom"
- **Type filtering** - Only shows relevant data types
- **Smart labels** - "Contact → Email" instead of "var-contact.email"
- **Manual entry** - Click "+ Enter value manually..." to type freely
- **Dual mode** - Switches between combobox and text input for manual entry

**Props:**
```typescript
interface VariableSelectorProps {
  value: string                     // Current value or variable ref
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  filterByDataType?: string | string[]  // Filter by type(s)
  allowManualEntry?: boolean        // Show manual entry option
  placeholder?: string
  className?: string
}
```

**Usage Example:**
```tsx
<VariableSelector
  value={action.config.to}
  onChange={(value) => handleChange("to", value)}
  variables={variables}
  filterByDataType="email"
  allowManualEntry={true}
  placeholder="Select email or enter manually..."
/>
```

---

### 4. Integration (All 6 Actions Updated)

#### **send_email** (`send-email-config.tsx`)
- **To**: VariableSelector (filter: `email`)
- **Subject**: VariableSelector (filter: `text`)
- **From**: VariableSelector (filter: `email`)
- **Body**: Textarea (variable insertion coming later)

#### **create_task** (`create-task-config.tsx`)
- **Title**: VariableSelector (filter: `text`)
- **User ID**: VariableSelector (filter: `["user", "email"]`) - when assignTo type is "user"
- **Description**: Textarea (plain text)

#### **update_contact** (`update-contact-config.tsx`)
- **Field values**: VariableSelector (filter: `text`)
- Field names remain text inputs

#### **update_status** (`update-status-config.tsx`)
- **Status**: VariableSelector (filter: `text`)

#### **update_task** (`update-task-config.tsx`)
- **Field values**: VariableSelector (filter: `text`)
- Field names and taskActionId remain text inputs

#### **create_contact** (`create-contact-config.tsx`)
- **Field values**: VariableSelector (filter: `text`)
- Field names and contact type remain text inputs

---

## 🎯 How It Works

### Example Flow

1. **User sets trigger to "Manual"**
   - System auto-detects `var-contact` with fields: email, firstName, lastName, phone, company

2. **User adds "Send Email" action**
   - Clicks "To" field → VariableSelector opens
   - Shows grouped options:
     - **From Trigger**
       - Contact → Email ✉️
       - Contact → First Name
       - Contact → Last Name
       - etc.
   - User selects "Contact → Email"
   - Value stored as: `"var-contact.email"`

3. **User adds "Create Task" action**
   - System auto-detects `var-task-action-2` with fields: assignedTo, status, outcome
   - Now available in subsequent steps

4. **User adds "Send Email" action (step 2)**
   - Clicks "Subject" field → VariableSelector opens
   - Shows:
     - **From Trigger** (Contact fields)
     - **From Actions**
       - Task: Submit Application → Status
       - Task: Submit Application → Outcome
     - **+ Enter value manually...**

5. **Display**
   - Internally: `"var-contact.email"`
   - User sees: "Contact → Email"
   - No more `{{contact.email}}` syntax!

---

## 📁 Files Modified

### Created
- `types/workflow-v2.ts` - Added WorkflowVariable types
- `lib/workflow-builder-v2/variable-utils.ts` - Auto-detection logic
- `app/builder-test/components/variable-selector.tsx` - Combobox component

### Updated (Component Chain)
1. `workflow-builder-v2.tsx` - Compute variables with `getAllVariables()`, pass to config panel
2. `step-config-panel-v2.tsx` - Accept variables prop, pass to ActionList
3. `action-list.tsx` - Accept variables prop, pass to ActionCard
4. `action-card.tsx` - Accept variables prop, pass to all 6 action configs

### Updated (Action Configs - All 6)
- `send-email-config.tsx` - VariableSelector for to, subject, from
- `create-task-config.tsx` - VariableSelector for title, userId
- `update-contact-config.tsx` - VariableSelector for field values
- `update-status-config.tsx` - VariableSelector for status
- `update-task-config.tsx` - VariableSelector for field values
- `create-contact-config.tsx` - VariableSelector for field values

### Updated (Mock Data)
- `lib/workflow-builder-v2/mock-workflows-v2.ts` - Changed `variables: {}` to `variables: []`

---

## 🚀 Next Steps (Future Enhancements)

### Phase 1 Complete ✅
- [x] Type system
- [x] Auto-detection
- [x] VariableSelector component
- [x] All 6 actions integrated

### Phase 2 (Future)
- [ ] Variable management UI (add custom variables)
- [ ] Rich text editor for email body with variable insertion
- [ ] Condition builder using variables (for conditional_branches)
- [ ] Variable preview/testing mode
- [ ] Variable type validation (ensure email fields get email variables)

### Phase 3 (Future)
- [ ] Custom variable types (beyond contact/task/form)
- [ ] Variable transformations (e.g., uppercase, format date)
- [ ] Variable defaults/fallbacks
- [ ] Variable validation rules

---

## 🎨 UX Improvements

**Before:**
```
To: [email@example.com or {{contact.email}}]
```
- User must remember syntax
- No autocomplete
- Error-prone
- No validation

**After:**
```
To: [Contact → Email ▼]
```
- Click opens combobox
- Searchable
- Grouped by source
- Type-safe (only email variables shown)
- Manual entry still available

---

## 💡 Key Design Decisions

1. **Auto-detection over manual definition** - Variables are automatically created from triggers/actions, reducing user burden

2. **Combobox over dropdown** - Searchable, better for many variables

3. **Grouped by source** - "From Trigger", "From Actions", "Custom" makes it clear where variables come from

4. **Type filtering** - Context-aware: email fields only show email variables

5. **Manual entry escape hatch** - Can still type values directly when needed

6. **Smart display labels** - "Contact → Email" is clearer than "var-contact.email"

7. **Read-only auto-detected vars** - Prevents users from breaking auto-detection logic

---

**Status:** ✅ Complete - All 6 action types now use type-aware variable system
