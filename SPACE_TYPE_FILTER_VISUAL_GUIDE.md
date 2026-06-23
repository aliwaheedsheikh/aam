# Space Type Filter - Visual User Guide

## 🎯 Purpose
This guide shows front office staff how to use the new **Space Type Filter** when creating reservations during live customer calls.

---

## 📞 Scenario: Customer Calls for a Wedding Booking

### Customer Says: "I need the entire Marquee 1 for my daughter's wedding"

**OLD WAY (Confusing):**
```
Staff sees 3 dropdowns:
- Venue: [Select venue...]
- Prime Space: [Select prime space...] ← "Do I select this?"
- Sub Space: [Select sub space...] ← "Or this? Or both?"
```
❌ **Problem**: Staff confused about which to use. Needs to remember "leave sub-space empty for full venue"

**NEW WAY (Clear & Fast):**
```
STEP 1: Staff clicks "Prime Space" card
┌─────────────────────────────────────────────────────────┐
│ 🔵 ✓ Prime Space              🟣   Sub-Space           │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓                                          │
│ Full venue booking            Partial venue booking    │
│ Books entire venue            Books portion only       │
└─────────────────────────────────────────────────────────┘

STEP 2: Staff selects venue and prime space
┌─────────────────────────────────────────────────────────┐
│ Venue: [Grand Events]   Prime Space: [Marquee 1]       │
│ ✓ Full venue - All sub-spaces blocked                  │
└─────────────────────────────────────────────────────────┘
```
✅ **Result**: 2 clicks, crystal clear, no confusion!

---

### Customer Says: "I just need the M1-A section for a small birthday party"

**OLD WAY (Confusing):**
```
Staff sees 3 dropdowns and must remember:
1. Select Venue
2. Select Prime Space (Marquee 1)
3. Select Sub Space (M1-A)
"Wait, if I'm only booking M1-A, why do I select Marquee 1?"
```
❌ **Problem**: Confusing to select prime space when you don't want it

**NEW WAY (Clear & Fast):**
```
STEP 1: Staff clicks "Sub-Space" card
┌─────────────────────────────────────────────────────────┐
│ 🔵   Prime Space              🟣 ✓ Sub-Space           │
│                               ▓▓▓▓▓▓▓▓▓▓▓               │
│ Full venue booking            Partial venue booking    │
│ Books entire venue            Books portion only       │
└─────────────────────────────────────────────────────────┘

STEP 2: Staff selects venue, parent, and sub-space
┌─────────────────────────────────────────────────────────┐
│ Venue:        Parent Prime:    Sub-Space:              │
│ [Grand Events] [Marquee 1]     [M1-A]                  │
│ ✓ Partial booking - Others available                   │
└─────────────────────────────────────────────────────────┘
```
✅ **Result**: Makes sense! Parent shows context, sub-space is the actual booking

---

## 🎨 Visual Design Elements

### Space Type Cards (Step 1)

#### Prime Space Card - NOT Selected
```
┌─────────────────────────────────┐
│ ○  🏛️ Prime Space              │
│    Full venue booking           │
│    (e.g., Marquee 1)            │
│    Books entire venue, blocks   │
│    all sub-spaces               │
└─────────────────────────────────┘
```

#### Prime Space Card - SELECTED
```
┌═════════════════════════════════┐ ← Blue border + shadow
║ ⦿  🏛️ Prime Space              ║
║    Full venue booking           ║
║    (e.g., Marquee 1)            ║
║    Books entire venue, blocks   ║
║    all sub-spaces               ║
└═════════════════════════════════┘
```

#### Sub-Space Card - NOT Selected
```
┌─────────────────────────────────┐
│ ○  📐 Sub-Space                 │
│    Partial venue booking        │
│    (e.g., M1-A, M1-B)           │
│    Books portion only, others   │
│    remain available             │
└─────────────────────────────────┘
```

#### Sub-Space Card - SELECTED
```
┌═════════════════════════════════┐ ← Purple border + shadow
║ ⦿  📐 Sub-Space                 ║
║    Partial venue booking        ║
║    (e.g., M1-A, M1-B)           ║
║    Books portion only, others   ║
║    remain available             ║
└═════════════════════════════════┘
```

---

## 🔄 Complete Workflow Examples

### Example 1: Full Venue Booking (Wedding - 800 guests)

```
┌─ CUSTOMER REQUIREMENT ─────────────────────────────────┐
│ "I need the entire Marquee 1 on December 25th         │
│  for my daughter's wedding. Around 800 guests."        │
└────────────────────────────────────────────────────────┘

STAFF ACTION:

1️⃣ Click "Prime Space" card
   ┌─────────────────────┐
   │ ✓ Prime Space       │ ← SELECTED (Blue)
   └─────────────────────┘

2️⃣ Select from dropdowns:
   Venue: Grand Events
   Prime Space: Marquee 1
   
   ┌────────────────────────────────────────┐
   │ ✓ Full venue - All sub-spaces blocked │ ← Confirmation
   └────────────────────────────────────────┘

3️⃣ Continue with event details...

RESULT: ✅ Marquee 1 fully booked, M1-A, M1-B, M1-C all blocked
```

---

### Example 2: Partial Venue Booking (Birthday - 200 guests)

```
┌─ CUSTOMER REQUIREMENT ─────────────────────────────────┐
│ "I want to book the M1-A section for my son's          │
│  birthday. Just need space for 200 people."            │
└────────────────────────────────────────────────────────┘

STAFF ACTION:

1️⃣ Click "Sub-Space" card
   ┌─────────────────────┐
   │ ✓ Sub-Space         │ ← SELECTED (Purple)
   └─────────────────────┘

2️⃣ Select from dropdowns:
   Venue: Grand Events
   Parent Prime Space: Marquee 1
   Sub-Space: M1-A
   
   ┌────────────────────────────────────────┐
   │ ✓ Partial - Others available          │ ← Confirmation
   └────────────────────────────────────────┘

3️⃣ Continue with event details...

RESULT: ✅ Only M1-A booked, M1-B and M1-C still available for other bookings
```

---

### Example 3: Calendar Pre-selection (Quick Book)

```
┌─ SCENARIO ─────────────────────────────────────────────┐
│ Staff clicks on M1-B in the calendar view              │
│ System opens reservation dialog                        │
└────────────────────────────────────────────────────────┘

SYSTEM AUTOMATICALLY:

1️⃣ Pre-selects "Sub-Space" type
   ┌─────────────────────┐
   │ ✓ Sub-Space         │ ← LOCKED (can't change)
   └─────────────────────┘
   
   ℹ️ Pre-selected from Calendar:
      Space type is locked based on your calendar selection.

2️⃣ Pre-fills the dropdowns:
   Venue: Grand Events ✓
   Parent Prime Space: Marquee 1 ✓
   Sub-Space: M1-B ✓
   
3️⃣ Staff just fills customer info and saves!

RESULT: ✅ Fastest booking possible - 80% pre-filled!
```

---

## 📊 Layout Differences

### Prime Space Layout (2 Columns)
```
┌───────────────────────────────────────────┐
│ Step 2: Select Venue & Prime Space       │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────┐    ┌─────────────┐      │
│  │   Venue     │    │ Prime Space │      │
│  │             │    │             │      │
│  │ [Select...] │    │ [Select...] │      │
│  └─────────────┘    └─────────────┘      │
│                                           │
│  ℹ️ Books ENTIRE venue for date/time     │
│     All sub-spaces will be blocked       │
└───────────────────────────────────────────┘
```

### Sub-Space Layout (3 Columns)
```
┌────────────────────────────────────────────────────┐
│ Step 2: Select Venue & Sub-Space                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌───────┐  ┌──────────────┐  ┌───────────┐      │
│  │ Venue │  │ Parent Prime │  │ Sub-Space │      │
│  │       │  │    Space     │  │           │      │
│  │[Sel..]│  │  [Select...] │  │[Select...] │      │
│  └───────┘  └──────────────┘  └───────────┘      │
│                                                    │
│  ℹ️ Books PORTION only for date/time              │
│     Other sub-spaces remain available             │
└────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference for Front Office

### "Customer wants FULL venue?"
→ Click **Blue "Prime Space"** card
→ 2-column layout appears
→ Select Venue + Prime Space
→ Done! ✅

### "Customer wants PARTIAL venue?"
→ Click **Purple "Sub-Space"** card
→ 3-column layout appears
→ Select Venue + Parent + Sub-Space
→ Done! ✅

### "Already selected from calendar?"
→ Space type is **LOCKED** automatically
→ Venue/spaces are **PRE-FILLED**
→ Just add customer details
→ Done! ✅

---

## 🔍 Visual Indicators Reference

| Icon/Color | Meaning |
|------------|---------|
| 🔵 Blue | Prime Space (Full Venue) |
| 🟣 Purple | Sub-Space (Partial Venue) |
| ✓ Green Checkmark | Confirmed selection |
| 🏛️ Building Icon | Prime Space/Full Venue |
| 📐 Minimize Icon | Sub-Space/Partial Venue |
| ℹ️ Info Badge | Helpful context/explanation |
| ⦿ Filled Radio | Currently selected option |
| ○ Empty Radio | Not selected option |

---

## ✨ Benefits Summary

### For Front Office Staff:
✅ **Faster Bookings**: 2-step process instead of figuring out 3 dropdowns
✅ **No Confusion**: Clear visual separation of booking types
✅ **Less Training**: New staff understand immediately
✅ **Fewer Errors**: Can't accidentally book wrong space type
✅ **Better Phone Calls**: Confidence during live customer calls

### For Customers:
✅ **Quick Service**: Staff can book faster
✅ **Accurate Bookings**: Less chance of errors
✅ **Professional Experience**: Staff sounds knowledgeable and confident

### For Management:
✅ **Less Training Time**: Intuitive interface
✅ **Fewer Booking Mistakes**: Visual validation
✅ **Better Staff Efficiency**: Faster reservation processing
✅ **Consistent Process**: Same flow every time

---

## 🆘 Troubleshooting

### Q: "I can't change the space type"
**A**: You clicked from the calendar. The space type is pre-selected and locked. This is correct behavior.

### Q: "I selected Sub-Space but want Prime Space now"
**A**: Just click the "Prime Space" card in Step 1. Your previous selections will clear automatically.

### Q: "Why do I see 2 columns sometimes and 3 columns other times?"
**A**: The layout adapts:
- **Prime Space** = 2 columns (Venue + Prime Space)
- **Sub-Space** = 3 columns (Venue + Parent + Sub-Space)

### Q: "What does 'Parent Prime Space' mean?"
**A**: When booking a sub-space (like M1-A), you need to select which venue it belongs to (Marquee 1). That's the "parent."

---

## 📝 Training Checklist

- [ ] Staff understands the difference between Prime Space and Sub-Space
- [ ] Staff can select Prime Space for full venue bookings
- [ ] Staff can select Sub-Space for partial venue bookings
- [ ] Staff knows the layout changes based on space type
- [ ] Staff understands calendar pre-selection locks the space type
- [ ] Staff recognizes all visual indicators (colors, icons, checkmarks)
- [ ] Staff can complete a full booking in under 2 minutes

---

**Last Updated**: January 2026
**Version**: 2.0 - Space Type Filter Implementation
