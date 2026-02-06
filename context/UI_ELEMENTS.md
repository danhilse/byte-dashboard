# BYTE Dashboard - UI Elements Reference

Complete documentation of all UI elements by page/view.

---

## Table of Contents

1. [Dashboard](#1-dashboard)
2. [My Work](#2-my-work)
3. [Calendar](#3-calendar)
4. [People](#4-people)
5. [Support](#5-support)
6. [Workflow Blueprints](#6-workflow-blueprints)
7. [Workflow Builder](#7-workflow-builder)
8. [Form Builder](#8-form-builder)
9. [Settings](#9-settings)
10. [Contact/Person Detail](#10-contactperson-detail)
11. [Application Detail](#11-application-detail)

---

## 1. Dashboard

**Route:** `/`

### Header
- Page title: "Dashboard"
- Settings icon button (customize layout)
- Add Widget button

### Primary Content - Widget Grid

Drag-and-drop customizable grid with available widgets:

#### Stats Widget
| Stat | Icon Color |
|------|------------|
| Total Contacts | Blue |
| Total Applications | Blue |
| Pending Review | Yellow |
| Approved | Green |
| Rejected | Red |
| On Hold | Orange |

Each stat displays: icon, value (large number), label

#### Recent Applications Widget
- Applicant name
- Status badge
- Workflow name
- Created date
- Progress bar (completion %)
- Task completion ratio (e.g., "3/5 tasks")

#### Upcoming Tasks Widget
- Task title
- Status indicator
- Due date
- Assigned user

#### Activity Feed Widget
- Activity description
- User avatar
- Timestamp
- Action type (create, update, delete)

#### Calendar Widget
- Mini calendar view
- Highlighted dates with events
- Task count indicators
- Quick event preview on hover

#### Tenant Management Widget (Super Admin only)
- Tenant list
- User counts per tenant
- Quick actions

---

## 2. My Work

**Route:** `/my-work`

### Header
- Title: "My Work"
- Subtitle: "Manage your tasks, applications, and workflow templates"
- "New Application" button (dropdown for admins):
  - From Existing Applicant
  - New Applicant + Application

### Tab Navigation
| Tab | Badge |
|-----|-------|
| Tasks | Task count |
| Applications | Application count |

### Search & Filters
- Search input
- View toggle: Table | Kanban | Grid
- Status filter chips (toggleable):
  - pending, in_progress, completed, overdue
  - "Clear All" option
- Workflow filter dropdown (Applications tab)
- Saved Filter Views button

### Tasks Tab - Table View

**Columns:**
| Column | Notes |
|--------|-------|
| Checkbox | Bulk selection |
| Task Title | Clickable |
| Workflow Step | Step name |
| Applicant | Contact name |
| Status | Inline pill selector |
| Assigned To | User(s) |
| Due Date | Date display |
| Actions | Dropdown: View, Edit, Claim, Delete |

**Additional Elements:**
- Row grouping by status (collapsible)
- Task Detail Dialog (on click)
- Bulk Actions Bar (when rows selected):
  - Selection count
  - Clear button
  - Delete selected button

### Tasks Tab - Kanban View

**Columns:** Pending | In Progress | Completed | Overdue

**Task Cards:**
- Title
- Status icon
- Assigned user avatar
- Due date
- Applicant name
- Workflow name

**Per Column:**
- Status count badge
- Add task button

### Applications Tab - Table View

**Status Groups (collapsible):**
| Status | Color | Default State |
|--------|-------|---------------|
| Draft | Gray | Expanded |
| In Review | Blue | Expanded |
| Pending | Yellow | Expanded |
| On Hold | Gray | Expanded |
| Approved | Green | Collapsed |
| Rejected | Red | Collapsed |

**Row Contents:**
- Checkbox (admin only)
- User avatar
- Applicant name (link to People)
- Status badge
- Workflow name (link to Application detail)
- Created date
- Progress bar with %
- Task completion ratio
- Actions dropdown: View Details, Delete

### Applications Tab - Kanban View

Same columns as status groups above.

**Application Cards:**
- Applicant photo/avatar
- Applicant name
- Status badge
- Workflow name
- Progress bar
- Task count
- Actions button

### Dialogs
- Create Application from Existing Contact
- Delete Confirmation
- Application Detail Modal
- Task Detail Modal

---

## 3. Calendar

**Route:** `/calendar`

### Header
- Title: "Calendar"
- Subtitle: "Schedule and track tasks"
- Personal/Team toggle
- "New Event" button

### Navigation Bar
- Previous/Next buttons
- "Today" button
- Date display (current view period)
- View mode: Day | Week | Month | Year

### Filter Section
- All | Tasks | Events

### Month View
- Day grid with padding days
- Day headers (Sun-Sat)
- Each day cell:
  - Day number
  - Task/event entries (max 2 visible)
    - Icon (CheckCircle/Clock)
    - Title (2-line clamp)
  - "+N more" badge
- Today: highlighted border + background
- Past month days: faded
- Double-click: create event
- Single-click: select day

### Week View
- 7-column grid
- Column headers: abbreviated day + date
- Per column:
  - Task/event entries
  - "No tasks" placeholder if empty

### Day View
- Full date display
- Task/event list:
  - Title (large, bold)
  - Type/workflow name
  - Status badge
- Empty state: "No entries scheduled for today"

### Year View
- 12-card grid (one per month)
- Each card:
  - Month name
  - Entry count badge
  - "View month" button

### Dialogs
- Task Detail Dialog
- Calendar Event Modal (create/edit)
- Calendar Event Detail (view)

---

## 4. People

**Route:** `/people`

### Header
- Page title
- Add Contact button
- View Options: Table | Card | Grid
- Advanced Filters button
- CSV Import button

### Search & Filters
- Search input (name/email)
- Active filter chips (clearable)
- Column visibility manager

### Table View

**Columns (customizable):**
| Column | Inline Editable |
|--------|-----------------|
| Avatar | No |
| First Name | Yes |
| Last Name | Yes |
| Email | Yes |
| Phone | Yes |
| Address Line 1 | Yes |
| Address Line 2 | Yes |
| City | Yes |
| State | Yes (dropdown) |
| ZIP | Yes |
| Status | Yes (dropdown) |
| Tags | Yes (chip editor) |
| Created Date | No |
| Last Updated | No |
| Applications Count | No |
| Custom Fields | Varies |

**Row Actions:**
- View Profile
- Edit
- Create Application
- Bulk Create Applications (multi-select)
- Delete

**Bulk Operations Bar:**
- Selection count
- Clear button
- Bulk delete
- Bulk create applications

### Card View
- Contact cards in grid
- Each card:
  - Avatar/photo
  - Name
  - Email (linked)
  - Phone
  - Location
  - Status badge
  - Tags
  - Quick actions: View, Edit, Delete

### Grid View (Mobile)
- Compact grid
- Avatar, Name, One-line info
- Quick action menu

### Dialogs
- Add Contact Dialog (ContactForm)
- Edit Contact Dialog
- Delete Confirmation (warns about cascading deletes)
- CSV Import Dialog:
  - File upload
  - Column mapping
  - Preview
  - Import/Cancel
- Bulk Create Applications Dialog
- Advanced Filters Dialog:
  - Filter groups (AND/OR logic)
  - Status, Tags, Custom fields, Date ranges
  - Add/Remove groups
  - Apply/Reset

---

## 5. Support

**Route:** `/support`

### Header
- Title: "Support"
- "New Ticket" button

### Sidebar - Ticket List
- Filter buttons: All | Open | In Progress | Waiting on Client | Approved by Client | Resolved | Closed
- Search input
- Ticket items:
  - Title
  - Priority indicator
  - Status badge
  - Created date
  - Assigned user

### Main Content - Ticket Detail

**Ticket Header:**
- Title (editable for admins)
- Ticket ID
- Status badge (clickable dropdown)
- Priority level
- Created/Updated dates

**Ticket Information:**
- Created by (name + email)
- Assigned to (editable)
- Description (editable)

**Billing Information (if billable):**
| Field | Type |
|-------|------|
| Estimated hours | Number |
| Completed hours | Number |
| Billing tier | Dropdown |
| Hourly rate | Number |
| Is billable | Toggle |
| Client approved | Toggle |
| Priority rush | Toggle |

**Messages/Activity:**
- Add note form (textarea + button)
- Activity log:
  - Notes/updates
  - Status changes
  - Assignments
  - Timestamps
  - Author names

**Actions:**
- Assign to me
- Close ticket
- Delete (admin only)

### Dialogs
- Create/Edit Ticket Dialog

---

## 6. Workflow Blueprints

**Route:** `/workflow-blueprints`

### Header
- Title: "Workflow Blueprints"
- "New Workflow" button
- View toggle: Card | Table

### Search & Filters
- Search input (name/description)
- Status filter: All | Active | Inactive

### Card View
- Workflow cards in grid
- Each card:
  - Name
  - Description (truncated)
  - Status badge
  - Step count badge
  - Created/Updated dates
  - Actions: Edit, View Steps, Triggers, Export to Builder, Delete

### Table View

**Columns:**
| Column | Sortable |
|--------|----------|
| Name | Yes |
| Description | No |
| Status | Yes |
| Steps Count | Yes |
| Created Date | Yes |
| Updated Date | Yes |
| Is Active | Toggle |
| Actions | Dropdown |

### Dialogs
- Create Workflow Dialog:
  - Name input
  - Description textarea
  - Is Active toggle
- Edit Workflow Dialog
- Workflow Steps Dialog:
  - Ordered step list
  - Step name, order, description
  - Add/Edit/Delete step
- Trigger Management Dialog
- Delete Confirmation

---

## 7. Workflow Builder

**Route:** `/workflow-builder`

### Header
- Workflow name display
- Active status badge
- Save status indicator (idle/saving/saved/error)

### Left Sidebar
- Workflow selection dropdown
- Workflow list
- Properties panel (expandable)
- Node configuration panel

### Canvas (Center)

**Node Types:**
| Node | Purpose |
|------|---------|
| Start | Trigger point |
| Task | Step with action |
| Decision | Conditional branch |
| End | Completion |

**Canvas Features:**
- Drag nodes to position
- Drag between nodes to connect
- Node labels and icons
- Hover/select highlighting
- Zoom controls (+/-)
- Pan (grab to move)
- Layout direction toggle

### Right Sidebar - Properties Panel

**Selected Node:**
- Node type selector
- Name input
- Description textarea
- Condition settings (decision nodes)
- Action settings (action nodes)

**Workflow Settings:**
- Name input
- Description textarea
- Layout direction dropdown

**Actions:**
- Save changes
- Discard changes

### Toolbar
- Back button
- Refresh
- Layout options
- Export
- Delete workflow

---

## 8. Form Builder

**Route:** `/admin/forms`

### Header
- Title: "Form Builder"
- "Create Form" button
- Refresh button

### Search & Filters
- Search input (form name)
- Status filter: All | Draft | Published | Archived

### Form List Table

**Columns:**
| Column | Notes |
|--------|-------|
| Form Name | Clickable to edit |
| Description | |
| Status | Badge |
| Version | Number |
| Updated Date | |
| Created Date | |
| Actions | Edit, Preview, Publish, Archive, Delete |

### Create/Edit Form Dialog

**Form Settings:**
- Name input
- Description textarea
- Status selector

**Field Builder:**
- Add field button (dropdown):
  - Text input
  - Textarea
  - Checkbox
  - Radio group
  - Select/Dropdown
  - File upload
  - Email
  - Number
  - Date
  - Custom field
- Field list (drag to reorder):
  - Field label
  - Field type badge
  - Configure button
  - Delete button

**Form Options:**
- Required fields toggle
- Success message textarea
- Redirect URL input

### Field Configuration Modal
- Field label
- Field type (locked)
- Field key/identifier
- Required toggle
- Placeholder text
- Help text
- Options (multi-select fields)
- Validation rules:
  - Min/Max length
  - Pattern/Regex
  - Custom validation

### Form Preview
- Live preview with all fields
- Test submission
- Validation preview
- Error display

---

## 9. Settings

**Route:** `/settings`

### Header
- Title: "Settings"
- Trial status banner (if applicable)

### Tab Navigation
General | Billing & Plans | Users & Permissions | Integrations | Audit Logs | CRM Settings | Customizations

---

### General Tab

**Organization Info:**
- Organization name input
- Logo uploader
- Time zone selector

**Contact Info:**
- Primary contact email
- Support email
- Phone number

**Notification Preferences:**
- Email notifications toggle
- Frequency dropdown
- Notification type checkboxes

---

### Billing & Plans Tab

**Current Plan:**
- Plan name
- Monthly price
- Feature list
- Status

**Available Plans:**
| Plan | Price |
|------|-------|
| Starter | $99/mo |
| Pro | $499/mo |
| Elite | $999/mo |
| Custom | Contact Sales |

Each plan card: name, price, features, Select/Upgrade button

**Payment Method:**
- Card display (last 4 digits)
- Expiration date
- Update payment button

**Billing History:**
- Invoice table: Date, Amount, Status
- Download button per invoice

**Cancel Subscription Dialog:**
- Confirmation message
- Reason selector

---

### Users & Permissions Tab

**User List Table:**
| Column | Notes |
|--------|-------|
| Name | |
| Email | |
| Role | Badge |
| Status | Active/Invited/Inactive |
| Last Login | |
| Actions | Edit, Deactivate, Remove |

**Invite User:**
- Email input
- Role selector
- Send invite button

**Role Management:**
- Custom roles list
- Create/Edit/Delete role

**Invite Link:**
- Shareable link
- Copy button
- Expiration date

---

### Integrations Tab

**Available Integrations:**
- Integration name + logo
- Description
- Status (Connected/Not Connected)
- Configure/Connect button

**Integration Types:**
- Formstack
- Zapier
- Stripe
- Custom webhooks

---

### Audit Logs Tab

**Filters:**
- Date range picker
- User filter
- Action type filter
- Resource type filter
- Search input

**Audit Log Table:**
| Column | Notes |
|--------|-------|
| Timestamp | |
| User | |
| Action Type | |
| Resource Type | |
| Resource Name | |
| Changes | Expandable |
| IP Address | Admin only |

**Actions:**
- Export logs button

---

### CRM Settings Tab

**Custom Field Management:**
- Add custom field button
- Field list:
  - Field name
  - Field type badge
  - Required toggle
  - Edit/Delete buttons
- Drag to reorder

**Field Groups:**
- Create group button
- Group list with field count

---

### Customizations Tab

**Dashboard:**
- Widget management
- Layout presets
- Theme settings

**Forms:**
- Custom CSS input
- Branding options
- Field grouping

---

## 10. Contact/Person Detail

**Route:** `/people/{id}`

### Header
- Back to People button
- Contact name
- Status badge

### Tabs

---

#### Profile Tab

**Contact Information:**
| Field | Notes |
|-------|-------|
| Avatar | Upload option |
| First Name | |
| Middle Name | |
| Last Name | |
| Maiden Name | |
| Email(s) | |
| Phone(s) | |
| Date of Birth | |
| SSN | Admin only |

**Address:**
- Line 1, Line 2, City, State, ZIP

**Actions:**
- Edit button (inline or dialog)
- Save/Cancel (when editing)

---

#### Applications Tab

- Application list:
  - Workflow name
  - Status badge
  - Created date
  - View details link
  - Actions: View, Edit, Delete
- Create new application button
- Empty state: "No applications"

---

#### Notes Tab

**Add Note:**
- Textarea
- Post button

**Notes Log:**
- Note content
- Author name
- Timestamp
- Edit/Delete (author/admin)

---

#### Files Tab

- File upload (drag & drop)
- File list:
  - File name (download link)
  - Type icon
  - Size
  - Upload date
  - Delete button
- Empty state: "No files uploaded"

---

#### Custom Fields Tab

- Field groups
- Editable field values
- Save changes button

---

### Right Sidebar - Quick Actions

**Contact Actions:**
- Edit contact
- Create application
- Delete contact
- Export contact

**Summary:**
- Status badge
- Total applications count
- Last updated
- Created date

---

## 11. Application Detail

**Route:** `/applications/{id}` or modal from My Work

### Header
- Back button
- Application ID
- Status badge (dropdown to change - admin)
- Workflow name
- Applicant name

### Tabs

---

#### Overview Tab

**Applicant Info:**
- Name
- Email
- Contact link

**Application Status:**
- Large status badge
- Submitted date
- Last updated

**Workflow Progress:**
- Visual step pipeline:
  - Each step as card/pill
  - Current step highlighted
  - Completed steps with checkmarks
- Progress bar with %

**Key Info:**
- Workflow name
- Current step
- Assigned to
- Next action/due date

---

#### Workflow Progress Tab

**Current Instance:**
- Workflow name
- Started date
- Current step details:
  - Name
  - Description
  - Order (e.g., "Step 2 of 5")

**Workflow Tasks:**
- Task list in order:
  - Title
  - Status badge
  - Completion indicator
  - Completed date
- Mark complete option
- Task detail on click

**Step Navigation:**
- Previous/Next buttons
- Jump to step dropdown

---

#### Notes/Updates Tab

**Add Note:**
- Textarea
- Post button

**Activity Log:**
- Notes/updates chronologically
- Author, timestamp, content
- Edit/Delete (author/admin)
- Status change history

---

#### Form Data Tab

- Submitted form data display
- Organized by section
- Read-only (locked)
- Edit button (admin):
  - Fields become editable
  - Validation on submit

---

#### Documents/Files Tab

- File list:
  - Name (download link)
  - Type
  - Upload date
  - Delete button
- Upload area (drag & drop)

---

### Action Buttons
- Edit application
- Hold/Resume toggle
- Delete (admin, with confirmation)
- Mark complete
- Export data

### Sidebar (Optional)
- Status, Current step, Progress %, Assigned to
- Contact link
- Related applications

### Dialogs
- Task detail modal
- Status change confirmation
- Delete confirmation

---

## Common UI Patterns

### Reusable Components
- Button (sm/md/lg, default/outline/ghost/destructive)
- Card (Header, Content, Title, Description)
- Badge (colored status variants)
- Input (with icons)
- Select/Dropdown
- Tabs
- Dialog/Modal
- Table
- Checkbox
- Avatar
- Skeleton (loading)
- AlertDialog (confirmation)
- Textarea
- Switch (toggle)
- Collapsible sections

### Common Features
- Real-time search
- Status filtering
- Bulk actions (multi-select)
- View mode toggles
- Inline editing
- Drag-and-drop
- Responsive/mobile layouts
- Pagination/virtualization
- Empty states
- Confirmation dialogs
- Loading states (skeletons, spinners)
- Toast notifications
- Dark mode support
