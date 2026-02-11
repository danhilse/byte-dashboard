# Dashboard Animations Guide

This document describes the premium Framer Motion animations implemented across the Byte Dashboard.

## Overview

The dashboard now features tasteful, premium animations using Framer Motion that enhance the user experience without being distracting. All animations follow a consistent design language with smooth spring physics and carefully choreographed timing.

## Core Animation System

### Motion Variants Library (`lib/motion-variants.ts`)

Reusable animation variants that provide consistent motion across the app:

- **containerVariants** - Staggered children animations
- **cardVariants** - Subtle slide up with fade and scale
- **cardHoverVariants** - Interactive hover lift effect
- **listItemVariants** - Horizontal slide-in for list items
- **fadeInVariants** - Simple fade-in
- **scaleInVariants** - Scale and fade for modals/popovers
- **slideVariants** - Directional slide animations
- **progressBarVariants** - Smooth width animations for progress bars

### Spring Physics Settings

All animations use consistent spring physics for natural, premium feel:
- Stiffness: 100-400
- Damping: 15-30
- Mass: 0.5
- Easing: `[0.16, 1, 0.3, 1]` (custom cubic-bezier)

## Dashboard Components

### 1. Animated Counter (`components/common/animated-counter.tsx`)

**Purpose**: Animates numbers counting up from 0 to their target value

**Features**:
- Spring physics for natural deceleration
- Only animates when scrolled into view (performance optimization)
- Supports prefix/suffix (e.g., "$1,234" or "42%")

**Used for**:
- Hero section stats (Contacts, Active Workflows, Open Tasks, Completed This Week)
- Activity counters (Workflows, Tasks, Contacts)

### 2. Animated Stat Card (`components/dashboard/animated-stat-card.tsx`)

**Animations**:
- Initial: Fade in + scale from 0.9 to 1.0
- Hover: Scale to 1.05 + subtle background lightening
- Staggered delays (0.2s, 0.3s, 0.4s, 0.5s)

**Used in**: Hero section grid of 4 stat cards

### 3. Animated Workflow Lane (`components/dashboard/animated-workflow-lane.tsx`)

**Animations**:
- Label fade-in with slight Y translation
- Number scale-in effect (0.8 → 1.0)
- Progress bar width animation (0 → final width)
- Sequential timing: label → number → bar

**Used for**: Active/Blocked/Completed workflow distribution bars

### 4. Animated Attention Item (`components/dashboard/animated-attention-item.tsx`)

**Animations**:
- Initial: Slide in from left (-10px → 0)
- Hover: Scale 1.02 + background darkening
- Number: Delayed scale-in for emphasis

**Used for**: "Needs Attention Today" metrics (overdue tasks, due soon, high priority, blocked)

### 5. Animated Task Card (`components/dashboard/animated-task-card.tsx`)

**Animations**:
- Initial: Fade + Y translation (10px up)
- Hover: Scale 1.02 + border/background color shift
- Due date: Delayed fade-in
- Staggered by index (0.05s per card)

**Used in**: "My Priorities" task list

### 6. Animated Workflow Card (`components/dashboard/animated-workflow-card.tsx`)

**Animations**:
- Initial: Fade + Y translation (10px up)
- Hover: Scale 1.02 + Y lift (-2px) + shadow
- Content: Staggered fade-in (title → contact → timestamp → badge)
- Timing: 0.05s increments for each text element

**Used in**:
- "Recent Workflows" section
- "Workflows Needing Attention" section

### 7. Animated Hero Card (`components/dashboard/animated-hero-card.tsx`)

**Animations**:
- Smooth entrance with Y translation (20px → 0)
- Duration: 0.6s (slower for emphasis)
- Premium easing curve

**Used for**: Main gradient hero card at top of dashboard

### 8. Animated Badge Group (`components/dashboard/animated-badge-group.tsx`)

**Animations**:
- Badges: Scale from 0.8 with staggered delays (0.05s per badge)
- Hover: Scale 1.05 on individual badges
- Cursor: Default (not clickable)

**Used for**: Workflow status badges in "Workflow Status" section

### 9. Enhanced Activity Card (`components/dashboard/dashboard-recent-activity-card.tsx`)

**Animations**:
- Activity stat boxes: Scale in with hover lift (1.05)
- Activity items: Slide from left with staggered timing
- Activity dots: Scale from 0 with spring physics
- Counters: Animated number count-up

**Layout**: 3 stat boxes → activity feed → "View All" button

## Animation Timing Strategy

### Stagger Choreography

1. **Hero section** appears first (0.2-0.5s delays)
2. **Cards** appear in reading order (left to right, top to bottom)
3. **List items** within cards stagger by 0.05s each
4. **Progress bars** animate after labels (0.3s delay)

### Performance Optimizations

- **IntersectionObserver** for animated counters (only animate when visible)
- **Spring physics** instead of duration-based for 60fps smoothness
- **Will-change hints** automatically added by Framer Motion
- **Reduced motion** respected (Framer Motion handles automatically)

## Design Principles

### 1. Subtlety First
- Small scale changes (0.98 ↔ 1.02)
- Short distances (2-10px translations)
- Fast timing (0.3-0.4s for most interactions)

### 2. Purposeful Motion
- Entrance animations guide attention
- Hover states provide feedback
- Counters emphasize metrics

### 3. Consistent Language
- All cards use same entrance pattern
- All hover effects use same scale/lift
- All numbers use same spring physics

### 4. Performance Conscious
- Transforms only (no layout thrashing)
- GPU-accelerated properties (transform, opacity)
- Intersection observers for on-demand animation

## Adding New Animations

### Pattern 1: Animated List Items

```tsx
import { motion } from "framer-motion"

items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
  >
    {/* content */}
  </motion.div>
))
```

### Pattern 2: Interactive Cards

```tsx
import { motion } from "framer-motion"

<motion.div
  whileHover={{ scale: 1.02, y: -2 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  {/* card content */}
</motion.div>
```

### Pattern 3: Animated Counters

```tsx
import { AnimatedCounter } from "@/components/common/animated-counter"

<AnimatedCounter value={42} className="text-2xl font-semibold" />
```

## Testing Animations

### Visual QA Checklist

- [ ] No layout shift during page load
- [ ] Smooth 60fps animation on desktop
- [ ] No jank on mobile devices
- [ ] Hover states respond instantly (<100ms)
- [ ] Counters animate when scrolled into view
- [ ] Progress bars reach correct final values
- [ ] Stagger timing feels natural (not too slow/fast)

### Browser Testing

Tested and verified on:
- Chrome 120+ (desktop/mobile)
- Safari 17+ (desktop/mobile)
- Firefox 121+ (desktop)
- Edge 120+ (desktop)

### Accessibility

- Respects `prefers-reduced-motion` (handled by Framer Motion)
- All interactive elements remain keyboard accessible
- No content hidden by animations
- Animation failures gracefully degrade to static

## Future Enhancements

Potential additions (not yet implemented):

1. **Page transitions** - Route changes with slide/fade
2. **Skeleton loaders** - Shimmer effect for loading states
3. **Drag gestures** - Kanban card dragging with spring physics
4. **Micro-interactions** - Button press animations, checkbox checks
5. **Chart animations** - Animated line/bar chart reveals
6. **Toast notifications** - Slide in from corner with bounce

## Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Spring Physics Calculator](https://www.react-spring.dev/common/configs)
- [Easing Functions](https://easings.net/)
- [Motion Design Guidelines](https://material.io/design/motion)
