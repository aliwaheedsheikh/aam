# VenueOps ERP - Responsive Design Quick Reference

## 🎯 Screen Size Support

| Screen | Resolution | Status | What Changes |
|--------|-----------|--------|--------------|
| **27" Desktop** | 2560×1440+ | ✅ Baseline | Nothing (100%) |
| **24" Desktop** | 1920×1080 | ✅ Perfect | Font: 15px (95%) |
| **15" Laptop** | 1600×900 | ✅ Perfect | Font: 14px (90%) |
| **15" Laptop** | 1366×768 | ✅ Good | Font: 13px (85%) |
| **13" Laptop** | 1280×720 | ⚠️ Minimum | Font: 12px (80%) + zoom |
| **Smaller** | < 1280px | ❌ Warning | Shows banner |

## 🔧 Quick Fixes

### Fix Horizontal Overflow

```tsx
// ❌ BEFORE (Fixed Layout)
<div className="grid grid-cols-2 gap-6 p-6">

// ✅ AFTER (Responsive Layout)
<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 p-4 xl:p-6">
```

### Fix Small Text

```css
/* In /src/styles/responsive.css - Increase font size */
@media (min-width: 1366px) and (max-width: 1599px) {
  :root {
    --font-size: 14px; /* ⬆️ Increase from 13px */
  }
}
```

### Add Responsive Padding

```tsx
// Small screens: 16px, Large screens: 24px
<div className="px-4 xl:px-6 py-3 xl:py-4">
```

### Stack Columns on Small Screens

```tsx
<div className="grid grid-cols-1 xl:grid-cols-2">
  {/* Auto-stacks on laptop, 2-col on desktop */}
</div>
```

## 🧪 Testing

### Chrome DevTools (F12)
1. Press `Ctrl+Shift+M` (Toggle device toolbar)
2. Enter custom dimensions:
   - `2560 x 1440` - Large Desktop
   - `1920 x 1080` - Desktop
   - `1366 x 768` - Laptop
   - `1280 x 720` - Minimum

### Enable Dev Mode Indicator
```tsx
// Add to body tag
<body data-dev-mode>
```
Shows badge: 🖥️ Purple (1920+), Green (1600+), 💻 Blue (1366+), Orange (1280+), 📱 Red (<1280)

## 📝 Responsive Patterns

```tsx
// ✅ Responsive Spacing
className="p-4 xl:p-6"           // Padding
className="gap-3 xl:gap-6"       // Grid gap
className="space-y-3 xl:space-y-6" // Vertical spacing

// ✅ Responsive Layout
className="grid-cols-1 xl:grid-cols-2"  // Grid columns
className="flex-col xl:flex-row"        // Flex direction
className="hidden xl:block"             // Show/hide

// ✅ Responsive Sizing
className="text-sm xl:text-base"  // Font size
className="w-full xl:w-1/2"      // Width
className="min-w-[1280px]"       // Minimum width

// ✅ Responsive Heights
className="h-auto xl:h-screen"
className="max-h-[500px] xl:max-h-[800px]"
```

## 🚨 Common Mistakes

| ❌ Don't Do This | ✅ Do This Instead |
|-----------------|-------------------|
| `className="grid-cols-2"` | `className="grid-cols-1 xl:grid-cols-2"` |
| `className="px-6"` | `className="px-4 xl:px-6"` |
| `style={{fontSize: '24px'}}` | `className="text-xl"` |
| `style={{width: '600px'}}` | `className="w-full max-w-2xl"` |
| Fixed pixel heights | `className="h-auto xl:h-screen"` |

## 📂 Key Files

- `/src/styles/responsive.css` - Responsive design system
- `/src/app/components/calendar/ReservationWorkspace.tsx` - Example
- `/RESPONSIVE_DESIGN_GUIDE.md` - Full documentation

## 🔍 Troubleshooting

**Issue:** Horizontal scroll appears  
**Fix:** Add `xl:` prefix to grid-cols-2 → `grid-cols-1 xl:grid-cols-2`

**Issue:** Text too small  
**Fix:** Increase `--font-size` in responsive.css media queries

**Issue:** Warning banner on valid screen  
**Fix:** Lower threshold from 1279px to 1199px in responsive.css

**Issue:** Modal doesn't fit vertically  
**Fix:** Add `max-h-screen overflow-y-auto` to DialogContent

## 🎨 Tailwind Breakpoints

| Breakpoint | Min Width | Usage |
|-----------|-----------|-------|
| (default) | 0px | Mobile-first base |
| `sm:` | 640px | Not used (desktop-first) |
| `md:` | 768px | Not used (desktop-first) |
| `lg:` | 1024px | Not used (desktop-first) |
| `xl:` | 1280px | ⭐ **Primary breakpoint** |
| `2xl:` | 1536px | Optional enhancements |

---

**Quick Start:** Just add `xl:` prefix to larger values!  
**Example:** `gap-6` → `gap-4 xl:gap-6`
