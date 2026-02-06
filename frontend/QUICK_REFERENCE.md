# Design System Quick Reference

## Utility Classes

### Glass Effects
```tsx
className="glass-card"       // Cards with backdrop blur
className="glass-sidebar"    // Sidebar with enhanced blur
```

### Shadows
```tsx
className="shadow-refined"      // Multi-layer refined shadow
className="shadow-refined-lg"   // Enhanced depth for elevated surfaces
```

### Animations
```tsx
className="animate-slide-up"   // Slide up from 10px with fade
className="animate-fade-in"    // Simple fade in
className="animate-scale-in"   // Scale from 96% to 100%
```

### Staggered Delays
```tsx
className="stagger-1"  // 0.05s delay
className="stagger-2"  // 0.1s delay
className="stagger-3"  // 0.15s delay
className="stagger-4"  // 0.2s delay
```

### Hover Effects
```tsx
className="hover-lift"  // Vertical lift with enhanced shadow
```

---

## Component Patterns

### Enhanced Stat Card
```tsx
<div className="animate-slide-up stagger-1">
  <StatCard
    title="Total Contacts"
    value={stats.totalContacts}
    icon={Users}
    trend={{ value: 12, isPositive: true }}
  />
</div>
```

### Glass Card
```tsx
<Card className="glass-card hover-lift">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Refined Button
```tsx
<Button
  variant="default"
  size="lg"
  className="shadow-sm hover:shadow"
>
  Action
</Button>
```

### Enhanced Input
```tsx
<Input
  placeholder="Search..."
  className="rounded-lg shadow-sm"
/>
```

---

## Color Variables

### Light Mode
```css
--background: oklch(0.99 0.002 90)
--foreground: oklch(0.15 0.01 270)
--primary: oklch(0.22 0.015 270)
--border: oklch(0.90 0.005 270)
```

### Dark Mode
```css
--background: oklch(0.14 0.008 270)
--foreground: oklch(0.96 0.005 90)
--primary: oklch(0.90 0.01 270)
--border: oklch(1 0 0 / 0.12)
```

### Glass Effects
```css
--glass-bg: oklch(1 0 0 / 0.6)
--glass-border: oklch(0.9 0.005 270 / 0.4)
--glass-shadow: oklch(0.15 0.01 270 / 0.08)
```

---

## Border Radius Scale
```css
--radius: 0.75rem       // Base (12px)
rounded-lg: 0.75rem     // Large (12px)
rounded-xl: 1rem        // Extra large (16px)
rounded-2xl: 1.5rem     // 2XL (24px)
```

---

## Animation Timing
```css
Duration: 200ms         // Interactive elements
Duration: 150ms         // Badges, small UI
Duration: 400ms         // Page load animations
Easing: cubic-bezier(0.16, 1, 0.3, 1)  // Smooth, natural
```

---

## Typography Scale
```tsx
text-xs     // 12px - Metadata, captions
text-sm     // 14px - Body text (default)
text-base   // 16px - Emphasized body
text-lg     // 18px - Subheadings
text-xl     // 20px - Headings
text-2xl    // 24px - Large headings
text-3xl    // 30px - Stat values, hero
```

---

## Common Combinations

### Page Load Animation
```tsx
<div className="animate-slide-up stagger-1">
  <Card className="hover-lift shadow-refined">
    ...
  </Card>
</div>
```

### Interactive Card
```tsx
<Card className="group/card hover-lift shadow-refined transition-all duration-200">
  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100" />
  ...
</Card>
```

### Enhanced Button Group
```tsx
<div className="flex gap-2">
  <Button className="shadow-sm hover:shadow">Primary</Button>
  <Button variant="outline" className="hover:shadow">Secondary</Button>
</div>
```

### Refined Table Row
```tsx
<TableRow className="hover:bg-accent/30 transition-all duration-150 group/row">
  <TableCell>...</TableCell>
</TableRow>
```

---

## Best Practices

### Do ✅
- Use `hover-lift` for interactive cards
- Apply staggered animations to lists
- Use `shadow-refined` for elevated surfaces
- Add `group/` for nested hover states
- Use `transition-all duration-200` for smooth states

### Don't ❌
- Don't overuse animations (keep purposeful)
- Don't stack multiple hover effects
- Don't use `hover-lift` on small elements
- Don't forget dark mode variants
- Don't use heavy shadows on already elevated surfaces

---

## Testing Checklist

- [ ] Hover states feel responsive
- [ ] Animations are smooth (check 60fps)
- [ ] Dark mode looks refined
- [ ] Focus states are visible
- [ ] Touch targets are adequate (44px minimum)
- [ ] Reduced motion is respected
- [ ] Contrast ratios meet WCAG AA
- [ ] Glass effects have fallbacks

---

## Quick Wins

**Instant polish for any page:**
1. Wrap stats in `<div className="animate-slide-up stagger-{n}">`
2. Add `hover-lift` to Cards
3. Use `shadow-refined` instead of default shadows
4. Add `rounded-lg` to inputs and selects
5. Use `text-muted-foreground/60` for placeholders

**Instant interactivity:**
1. Add `group` and nested `group-hover:` states
2. Use `transition-all duration-200` liberally
3. Add subtle gradient overlays on hover
4. Scale icons on hover (`hover:scale-110`)
5. Add `active:scale-[0.98]` to buttons
