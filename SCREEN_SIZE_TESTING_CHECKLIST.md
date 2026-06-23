# VenueOps ERP - Screen Size Testing Checklist

## 📋 Pre-Release Testing Checklist

Use this checklist before deploying any UI changes to ensure responsive design works correctly.

---

## ✅ Screen Resolution Testing

### Test Each Resolution

- [ ] **2560×1440** (27" Large Desktop)
  - [ ] No horizontal scroll
  - [ ] Text crisp and clear
  - [ ] Two-column layout works
  - [ ] All modals fit on screen
  - [ ] Buttons/inputs normal size
  
- [ ] **1920×1080** (24" Standard Desktop)
  - [ ] No horizontal scroll
  - [ ] Text readable (95% scale)
  - [ ] Two-column layout works
  - [ ] All modals fit on screen
  - [ ] Buttons/inputs clickable
  
- [ ] **1600×900** (15" Laptop Large)
  - [ ] No horizontal scroll
  - [ ] Text readable (90% scale)
  - [ ] Two-column layout works
  - [ ] All modals fit on screen
  - [ ] Spacing feels comfortable
  
- [ ] **1366×768** (15" Laptop Standard)
  - [ ] No horizontal scroll
  - [ ] Text readable (85% scale)
  - [ ] Two-column OR single-column layout
  - [ ] All modals fit on screen
  - [ ] Can access all controls
  
- [ ] **1280×720** (13" Laptop Minimum)
  - [ ] Minimal/no horizontal scroll
  - [ ] Text readable (80% scale + zoom)
  - [ ] Single-column layout
  - [ ] All modals fit (with scroll if needed)
  - [ ] All critical functions accessible
  
- [ ] **< 1280px** (Below Minimum)
  - [ ] Warning banner appears
  - [ ] Application still usable
  - [ ] User informed of limitation

---

## ✅ Component-Specific Testing

### ReservationWorkspace Dialog

- [ ] **Header Section**
  - [ ] Reservation ID visible
  - [ ] Status badge shows
  - [ ] Action buttons accessible
  - [ ] Close button works
  
- [ ] **Two-Column Layout**
  - [ ] Stacks to single column on laptop screens
  - [ ] No overlap between columns
  - [ ] Gap spacing appropriate
  - [ ] Scroll works smoothly
  
- [ ] **Customer Information**
  - [ ] All input fields visible
  - [ ] Phone input displays correctly
  - [ ] Dropdown menus work
  - [ ] No text cutoff
  
- [ ] **Event Details**
  - [ ] Date picker opens properly
  - [ ] Time inputs accessible
  - [ ] Venue selection works
  - [ ] Space selection checkboxes visible
  
- [ ] **Menu Configuration**
  - [ ] Category tabs visible
  - [ ] Add item buttons work
  - [ ] Menu items list scrollable
  - [ ] Price calculations visible
  
- [ ] **RCS Services**
  - [ ] Service selection works
  - [ ] Quantity inputs accessible
  - [ ] Total calculations visible
  - [ ] Expand/collapse works
  
- [ ] **Financial Summary**
  - [ ] All amounts visible
  - [ ] Tax calculations shown
  - [ ] Grand total prominent
  - [ ] Payment policy readable
  
- [ ] **Activity History**
  - [ ] Timeline displays
  - [ ] Scroll works for long history
  - [ ] All entries readable
  - [ ] Timestamps visible

### Calendar Views

- [ ] **Month View**
  - [ ] All 7 days visible
  - [ ] Event cards not cut off
  - [ ] Navigation buttons accessible
  - [ ] Today indicator shows
  
- [ ] **Agenda View**
  - [ ] List items readable
  - [ ] Time slots aligned
  - [ ] Action buttons accessible
  - [ ] Filters work correctly
  
- [ ] **Event Availability Calendar**
  - [ ] Grid displays properly
  - [ ] Legend visible
  - [ ] Clickable areas work
  - [ ] Tooltips show

### Dashboard Components

- [ ] **Statistics Cards**
  - [ ] All cards visible
  - [ ] Numbers not cut off
  - [ ] Icons display
  - [ ] Grid responsive
  
- [ ] **Charts/Graphs**
  - [ ] Charts render properly
  - [ ] Labels readable
  - [ ] Legend visible
  - [ ] Tooltips work
  
- [ ] **Data Tables**
  - [ ] Headers visible
  - [ ] Columns don't overflow
  - [ ] Horizontal scroll if needed
  - [ ] Action buttons accessible

---

## ✅ Browser Zoom Testing

Test at different zoom levels to simulate various screen sizes:

- [ ] **90% Zoom**
  - [ ] Layout looks good
  - [ ] Text readable
  
- [ ] **100% Zoom** (Default)
  - [ ] Everything perfect
  - [ ] No issues
  
- [ ] **110% Zoom**
  - [ ] Still usable
  - [ ] Minor adjustments OK
  
- [ ] **125% Zoom**
  - [ ] Critical functions work
  - [ ] Some scroll acceptable
  
- [ ] **150% Zoom**
  - [ ] Application doesn't break
  - [ ] User can navigate

---

## ✅ Browser Compatibility

Test on each supported browser:

- [ ] **Chrome/Edge** (Chromium)
  - [ ] 2560×1440
  - [ ] 1920×1080
  - [ ] 1366×768
  - [ ] 1280×720
  
- [ ] **Firefox**
  - [ ] 2560×1440
  - [ ] 1920×1080
  - [ ] 1366×768
  - [ ] 1280×720
  
- [ ] **Safari** (Mac only)
  - [ ] 2560×1440
  - [ ] 1920×1080
  - [ ] 1366×768
  - [ ] 1280×720

---

## ✅ Functional Testing at Each Size

### Critical User Journeys

- [ ] **Create New Reservation**
  1. Open new reservation dialog
  2. Fill all required fields
  3. Select venue and space
  4. Add menu items
  5. Review financial summary
  6. Save reservation
  - Test at: 2560px, 1920px, 1366px, 1280px
  
- [ ] **Edit Existing Reservation**
  1. Open existing reservation
  2. Modify customer details
  3. Change event details
  4. Update menu
  5. Save changes
  - Test at: 2560px, 1920px, 1366px, 1280px
  
- [ ] **View Calendar**
  1. Navigate month view
  2. Switch to agenda view
  3. Click on event
  4. Use filters
  5. Quick book slot
  - Test at: 2560px, 1920px, 1366px, 1280px
  
- [ ] **Financial Operations**
  1. Review financial summary
  2. Apply discount
  3. Process payment
  4. Generate invoice
  5. Print/export
  - Test at: 2560px, 1920px, 1366px, 1280px

---

## ✅ Visual Regression Checks

### Spacing & Alignment

- [ ] Padding consistent across screens
- [ ] Margins don't collapse unexpectedly
- [ ] Grid gaps appropriate
- [ ] Content centered where expected

### Typography

- [ ] Headings properly sized
- [ ] Body text readable (min 12px)
- [ ] Line height comfortable
- [ ] No text overflow/cutoff

### Colors & Contrast

- [ ] Colors match design system
- [ ] Sufficient contrast (WCAG AA)
- [ ] Hover states work
- [ ] Focus indicators visible

### Interactive Elements

- [ ] Buttons min 36px height
- [ ] Inputs easy to click
- [ ] Dropdowns open correctly
- [ ] Modals center properly

---

## ✅ Performance Testing

- [ ] **Page Load**
  - [ ] Loads in < 2 seconds
  - [ ] No flash of unstyled content
  - [ ] Responsive CSS loads
  
- [ ] **Window Resize**
  - [ ] Smooth transitions
  - [ ] No layout shift
  - [ ] Immediate response
  
- [ ] **Scroll Performance**
  - [ ] Smooth scrolling
  - [ ] No jank/stutter
  - [ ] Sticky elements work

---

## ✅ Accessibility Testing

- [ ] **Keyboard Navigation**
  - [ ] Tab order logical
  - [ ] All controls reachable
  - [ ] Focus visible
  
- [ ] **Screen Reader**
  - [ ] Labels announced
  - [ ] State changes announced
  - [ ] Error messages read
  
- [ ] **Zoom Accessibility**
  - [ ] Text scales properly
  - [ ] Layout doesn't break
  - [ ] No horizontal scroll

---

## ✅ Edge Cases

- [ ] **Very Long Content**
  - [ ] Long customer names
  - [ ] Long venue names
  - [ ] Many menu items
  - [ ] Large financial numbers
  
- [ ] **Multiple Modals**
  - [ ] Stacking works
  - [ ] Z-index correct
  - [ ] All closeable
  
- [ ] **Empty States**
  - [ ] No data messages
  - [ ] Placeholder content
  - [ ] Error states
  
- [ ] **Maximum Data**
  - [ ] 100+ menu items
  - [ ] 50+ reservations
  - [ ] Complex space configuration

---

## 📊 Testing Tools

### Chrome DevTools
```
1. F12 to open DevTools
2. Ctrl+Shift+M for device toolbar
3. Enter custom dimensions
4. Test responsive behavior
```

### Firefox Responsive Design Mode
```
1. F12 to open DevTools
2. Ctrl+Shift+M for responsive mode
3. Select/create custom device
4. Test at different sizes
```

### Browser Zoom
```
1. Ctrl/Cmd + Plus (+) to zoom in
2. Ctrl/Cmd + Minus (-) to zoom out
3. Ctrl/Cmd + 0 to reset zoom
4. Test at 90%, 100%, 110%, 125%, 150%
```

---

## 🐛 Issue Tracking Template

When you find an issue, document it like this:

```markdown
### Issue: [Brief Description]

**Screen Size:** 1366×768
**Browser:** Chrome 120
**Zoom Level:** 100%

**Component:** ReservationWorkspace > Menu Configuration

**Expected:**
- Menu items should display in a scrollable list

**Actual:**
- Menu items overflow container, no scroll appears

**Screenshot:** [Attach screenshot]

**Priority:** High/Medium/Low

**Fix:**
- Change `overflow-hidden` to `overflow-y-auto`
- Add `max-h-[400px]` to container
```

---

## ✅ Sign-Off Checklist

Before marking testing complete:

- [ ] All screen resolutions tested
- [ ] All critical user journeys work
- [ ] No horizontal scroll (except < 1280px)
- [ ] Text readable at all sizes
- [ ] All interactive elements accessible
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Edge cases handled
- [ ] Issues documented
- [ ] Stakeholders approved

---

## 📝 Testing Notes

**Tester Name:** _______________  
**Date:** _______________  
**Version:** v2.0.10  
**Build:** _______________

**Overall Assessment:**
- [ ] ✅ Ready for production
- [ ] ⚠️ Minor issues (document below)
- [ ] ❌ Major issues (block release)

**Notes:**
```
[Add any additional observations here]
```

---

**Last Updated:** January 28, 2026  
**Testing Standard:** Desktop-First ERP v2.0
