# 📍 Prime Space vs Sub-Space Selection - Complete Guide

## ✅ IMPLEMENTATION COMPLETE

The VenueOps ERP system now has a **crystal-clear venue selection interface** that makes it easy for front office staff to understand the difference between **Prime Space** (full venue) and **Sub-Space** (partial venue) bookings.

---

## 🎯 What's Been Implemented

### 1. **Enhanced Visual Selection UI** ✨

The New Reservation Dialog now features:

#### **Prime Space Field** (Full Venue)
- 🏛️ **Icon:** Blue Building icon
- 📝 **Label:** "Prime Space (Full Venue)"
- 🔵 **Highlight:** Blue border when selected
- ✅ **Feedback:** Shows "Full venue booking - All sub-spaces will be blocked" when selected alone

#### **Sub Space Field** (Partial Venue)
- 📐 **Icon:** Purple Minimize icon  
- 📝 **Label:** "Sub Space (Partial - Optional)"
- 🟣 **Highlight:** Purple border when selected
- ✅ **Feedback:** Shows "Partial booking - Other sub-spaces remain available" when selected
- 💡 **Smart Placeholder:** Changes based on context:
  - If no Prime Space selected: "First select a Prime Space"
  - If Prime Space selected: "Leave empty for FULL venue"

---

### 2. **Inline Selection Guide** 📘

A prominent blue information box appears below the selection fields showing:

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 How to Select Venues:                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🏛️ For FULL Venue:                                          │
│    Select Prime Space ONLY (e.g., Marquee 1).               │
│    Leave Sub Space empty.                                   │
│    → Books entire venue (800 guests), blocks all sub-spaces │
│                                                              │
│ 📐 For PARTIAL Venue:                                        │
│    Select Prime Space + Sub Space (e.g., Marquee 1 → M1-A). │
│    → Books sub-space only (250 guests), others available    │
│                                                              │
│ ➕ For MULTIPLE Venues:                                      │
│    Currently not supported in single booking.               │
│    → Create separate bookings for each venue needed         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. **Visual Examples Component** 🎨

Access from sidebar: **"Venue Selection Guide"**

Shows three detailed visual examples:

#### **Example 1: Full Venue Booking**
- Visual field mockup showing Prime Space = "Marquee 1" ✓, Sub Space = [Empty] ❌
- Result breakdown with checkmarks and X marks
- Use case: "Ali & Sara Wedding - 800 guests"
- Cost: PKR 100,000 (full venue rate)

#### **Example 2: Partial Venue Booking**
- Visual field mockup showing Prime Space = "Marquee 1" ✓, Sub Space = "M1-A" ✓
- Result breakdown showing M1-B remains available
- Use case: "ABC Corporation Annual Dinner - 250 guests"
- Cost: PKR 50,000 (partial venue rate)

#### **Example 3: Multiple Venues Workaround**
- Shows limitation alert
- Demonstrates creating two separate bookings
- Use case: "Large Conference - 1500 guests"
- Cost: PKR 200,000 (two invoices)

---

### 4. **Comprehensive Documentation** 📚

#### `/VENUE_SELECTION_GUIDE.md`
- **17 sections** covering every scenario
- **Real-world examples** with exact booking steps
- **Common mistakes** section with fixes
- **Pro tips** for capacity optimization
- **Troubleshooting** guide
- **Quick reference table**

#### `/PRIME_VS_SUBSPACE_SELECTION_SUMMARY.md` (this file)
- Implementation overview
- Feature summary
- Access instructions

---

## 📋 How to Use the System

### **Scenario 1: Customer Wants FULL Marquee 1**

**Front Office Steps:**
1. Open New Reservation Dialog
2. Select Venue: "Aiwan-e-Akbari"
3. Select Prime Space: "Marquee 1"
4. **LEAVE Sub Space EMPTY** ← Key step!
5. System shows: ✅ "Full venue booking - All sub-spaces will be blocked"
6. Enter guest count (400-800)
7. Continue with booking

**Result:**
- Marquee 1 fully booked (PKR 100,000)
- M1-A automatically blocked
- M1-B automatically blocked

---

### **Scenario 2: Customer Wants ONLY M1-A**

**Front Office Steps:**
1. Open New Reservation Dialog
2. Select Venue: "Aiwan-e-Akbari"
3. Select Prime Space: "Marquee 1"
4. Select Sub Space: "M1-A" ← Key step!
5. System shows: ✅ "Partial booking - Other sub-spaces remain available"
6. Enter guest count (150-250)
7. Continue with booking

**Result:**
- M1-A booked (PKR 50,000)
- Marquee 1 (full) automatically blocked
- M1-B remains AVAILABLE for another customer

---

### **Scenario 3: Customer Wants Marquee 1 + Marquee 2**

**Front Office Steps:**
1. Create **First Booking:**
   - Venue: Aiwan-e-Akbari
   - Prime Space: Marquee 1
   - Sub Space: [Empty]
   
2. Create **Second Booking** (separate):
   - Venue: Aiwan-e-Akbari
   - Prime Space: Marquee 2
   - Sub Space: [Empty]

3. Link both bookings to same customer in notes

**Result:**
- Both venues fully booked
- Two separate invoices (PKR 100,000 each)
- Can be managed together via customer record

---

## 🎨 Visual Indicators Reference

### **When Prime Space ONLY is selected:**
```
┌──────────────────────────────────────────────┐
│ Prime Space: Marquee 1 ✓                     │
│ ┌────────────────────────────────────────┐   │
│ │ ✓ Full venue booking                   │   │
│ │ All sub-spaces will be blocked         │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ Sub Space: [EMPTY]                           │
└──────────────────────────────────────────────┘
```

### **When Prime Space + Sub Space are selected:**
```
┌──────────────────────────────────────────────┐
│ Prime Space: Marquee 1 ✓                     │
│                                              │
│ Sub Space: M1-A ✓                            │
│ ┌────────────────────────────────────────┐   │
│ │ ✓ Partial booking                      │   │
│ │ Other sub-spaces remain available      │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

---

## 📍 Access Points in the System

### **1. During New Reservation**
- Click "New Booking" button from calendar
- Event Details tab → Venue/Space Selection section
- Inline guide automatically visible

### **2. Venue Selection Guide (Visual Examples)**
- **Path:** Sidebar → "Venue Selection Guide"
- **Roles:** General Manager, Front Office Manager
- **Features:** Interactive visual examples, comparison table

### **3. Venue Rules Demo**
- **Path:** Sidebar → "Venue Rules Demo"
- **Roles:** General Manager, Front Office Manager
- **Features:** Live dependency testing, 4 test scenarios

---

## 🎓 Training Quick Start

### **For New Front Office Staff:**

1. **Read Documentation:**
   - `/VENUE_SELECTION_GUIDE.md` (5-minute read)

2. **View Visual Examples:**
   - Login → Sidebar → "Venue Selection Guide"
   - Review all 3 examples

3. **Test Live Scenarios:**
   - Sidebar → "Venue Rules Demo"
   - Test each of the 4 scenarios
   - See how venues become blocked/available

4. **Practice Booking:**
   - Create test reservation with full venue
   - Create test reservation with sub-space
   - Compare the differences

5. **Reference During Calls:**
   - Keep "Venue Selection Guide" open in second tab
   - Use quick reference table for capacity checks

---

## ❓ Frequently Asked Questions

### **Q: Customer says "I want Marquee 1". What should I ask?**
**A:** Ask: "Do you need the FULL Marquee 1 (800 guests) or just a SECTION of it (250-400 guests)?"
- If FULL → Select Prime Space only
- If SECTION → Select Prime Space + Sub Space

---

### **Q: Can I book M1-A and M1-B for the same customer?**
**A:** Yes! These are concurrent bookings:
1. First booking: Prime Space = Marquee 1, Sub Space = M1-A
2. Second booking: Prime Space = Marquee 1, Sub Space = M1-B
3. Result: Both sub-spaces booked, Marquee 1 (full) blocked

---

### **Q: Customer wants "250 guests". Which should I select?**
**A:** Two options:
- **M1-A** (250 capacity, PKR 50,000)
- **M1-B** (400 capacity, PKR 60,000)

Recommend M1-A if exactly 250 guests. Recommend M1-B if they might increase to 300-400.

---

### **Q: What if I accidentally select both Prime + Sub but wanted full venue?**
**A:** Just clear the Sub Space selection:
1. Click on Sub Space dropdown
2. Select nothing (or remove selection)
3. System will update to "Full venue booking"

---

### **Q: Can I select multiple Prime Spaces in one booking?**
**A:** No, currently not supported. Workaround:
- Create separate bookings for each Prime Space
- Link them to same customer

---

## 📊 Quick Decision Tree

```
Customer calls asking for venue
         ↓
    Ask about guest count
         ↓
    ┌────┴────┐
    │         │
  400+      150-400
    │         │
    ↓         ↓
Full Venue  Which section?
    │         │
    ↓         ↓
Prime ONLY  Prime + Sub
  (Empty)     (Select)
```

---

## ✅ Summary of Options

| What Customer Wants | Prime Space | Sub Space | Result |
|--------------------|-------------|-----------|---------|
| "Full Marquee 1" | ✓ Marquee 1 | ❌ Empty | 800 capacity, PKR 100,000 |
| "Just M1-A section" | ✓ Marquee 1 | ✓ M1-A | 250 capacity, PKR 50,000 |
| "Just M1-B section" | ✓ Marquee 1 | ✓ M1-B | 400 capacity, PKR 60,000 |
| "Both M1-A and M1-B" | Create 2 bookings | See above | 650 total, PKR 110,000 |
| "M1 + M2 both" | Create 2 bookings | Both empty | 1600 total, PKR 200,000 |

---

## 🎯 Key Takeaways

1. **Prime Space ONLY** = Full venue booking
2. **Prime Space + Sub Space** = Partial venue booking
3. **Multiple venues** = Multiple separate bookings
4. **Visual feedback** confirms your selection type
5. **Inline guide** is always visible for reference

---

## 📞 Support

For questions or clarifications:
- **View Examples:** Sidebar → "Venue Selection Guide"
- **Test Live:** Sidebar → "Venue Rules Demo"
- **Read Docs:** `/VENUE_SELECTION_GUIDE.md`
- **Check Rules:** `/src/app/components/calendar/VENUE_RULES.md`

---

**Last Updated:** January 15, 2026  
**System Version:** VenueOps ERP v2.0  
**Status:** ✅ Fully Implemented and Tested
