# 📍 Venue Selection Guide - VenueOps ERP

## How to Select Prime Space vs Sub-Space in Reservations

This guide explains the **three different ways** to book venues in the VenueOps ERP system.

---

## 🏛️ Option 1: Full Venue Booking (Prime Space Only)

**Use Case:** Customer wants the ENTIRE venue with FULL capacity

### Steps:
1. ✅ Select **Venue** (e.g., "Aiwan-e-Akbari")
2. ✅ Select **Prime Space** (e.g., "Marquee 1")
3. ❌ **LEAVE Sub Space EMPTY** (Don't select anything)

### Example:
```
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: [EMPTY - Leave blank]
```

### Result:
- ✅ **Full venue booked** (Marquee 1 - 800 guests capacity)
- ❌ **All sub-spaces blocked** (M1-A and M1-B become unavailable)
- 💰 **Charges:** Full venue rate (e.g., PKR 100,000)
- 📊 **Invoice shows:** "Marquee 1 (Full Venue)"

### Visual Confirmation:
When you select Prime Space ONLY, you'll see:
> ✓ **Full venue booking - All sub-spaces will be blocked**

---

## 📐 Option 2: Partial Venue Booking (Prime Space + Sub-Space)

**Use Case:** Customer wants only PART of the venue with SMALLER capacity

### Steps:
1. ✅ Select **Venue** (e.g., "Aiwan-e-Akbari")
2. ✅ Select **Prime Space** (e.g., "Marquee 1")
3. ✅ Select **Sub Space** (e.g., "M1-A")

### Example:
```
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: M1-A ✓
```

### Result:
- ✅ **Sub-space booked** (M1-A only - 250 guests capacity)
- ❌ **Full venue blocked** (Marquee 1 cannot be booked)
- ✅ **Other sub-spaces available** (M1-B remains available for another customer)
- 💰 **Charges:** Partial venue rate (e.g., PKR 50,000)
- 📊 **Invoice shows:** "M1-A (Partial Venue)"

### Visual Confirmation:
When you select Prime Space + Sub Space, you'll see:
> ✓ **Partial booking - Other sub-spaces remain available**

---

## 🔄 Option 3: Multiple Prime Spaces (Future Feature)

**Use Case:** Customer wants MULTIPLE separate venues (e.g., Marquee 1 + Marquee 2)

### Current Limitation:
⚠️ **Not supported in a single booking**

### Workaround:
Create **separate bookings** for each venue:

#### Booking 1:
```
Customer: Ali Raza
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: [EMPTY]
```

#### Booking 2:
```
Customer: Ali Raza
Venue: Aiwan-e-Akbari
Prime Space: Marquee 2 ✓
Sub Space: [EMPTY]
```

### Result:
- ✅ Both Marquee 1 AND Marquee 2 are booked
- 💰 **Charges:** Sum of both full venue rates
- 📊 **Invoices:** Two separate invoices (can be linked to same customer)

---

## 📋 Quick Reference Table

| Booking Type | Prime Space | Sub Space | Capacity | Result |
|-------------|-------------|-----------|----------|--------|
| **Full Venue** | ✓ Selected | ❌ Empty | 800 guests | Entire venue booked, all sub-spaces blocked |
| **Partial Venue** | ✓ Selected | ✓ Selected | 250-400 guests | Only sub-space booked, other sub-spaces available |
| **Multiple Venues** | ✓ Selected | ❌ Empty | Multiple | Create separate bookings for each venue |

---

## 🎯 Real-World Examples

### Example 1: Large Wedding (800 guests)
**Customer:** Ali & Sara Wedding
**Requirement:** Need full Marquee 1

**Selection:**
```
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: [EMPTY] ❌
Guest Count: 800
```

**Outcome:**
- Marquee 1 fully booked
- M1-A and M1-B automatically blocked
- No other customer can book any part of Marquee 1

---

### Example 2: Corporate Event (250 guests)
**Customer:** ABC Corporation Annual Dinner
**Requirement:** Need only M1-A

**Selection:**
```
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: M1-A ✓
Guest Count: 250
```

**Outcome:**
- M1-A booked for ABC Corporation
- Marquee 1 (full venue) automatically blocked
- M1-B remains available for another event

---

### Example 3: Two Concurrent Events
**Customer 1:** Ali Waheed (Corporate)
**Customer 2:** Sara Ahmad (Birthday)
**Requirement:** Both need separate spaces on same day

**Booking 1:**
```
Customer: Ali Waheed
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: M1-A ✓
Guest Count: 250
```

**Booking 2:**
```
Customer: Sara Ahmad
Venue: Aiwan-e-Akbari
Prime Space: Marquee 1 ✓
Sub Space: M1-B ✓
Guest Count: 400
```

**Outcome:**
- M1-A booked for Ali Waheed's corporate event
- M1-B booked for Sara Ahmad's birthday party
- Marquee 1 (full venue) automatically blocked
- Both events run simultaneously

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Selecting Sub Space without Prime Space
```
Prime Space: [EMPTY]
Sub Space: M1-A ✓  ← WRONG!
```
**Error:** System requires Prime Space first.
**Fix:** Always select Prime Space before Sub Space.

---

### ❌ Mistake 2: Trying to book Full + Partial
```
Prime Space: Marquee 1 ✓
Sub Space: M1-A ✓
```
**Then changing to:**
```
Prime Space: Marquee 1 ✓
Sub Space: [EMPTY]
```
**Confusion:** This changes booking from partial to full.
**Fix:** Decide booking type before starting.

---

### ❌ Mistake 3: Expecting multiple venues in one booking
```
Prime Space: Marquee 1 + Marquee 2 ← NOT POSSIBLE
```
**Fix:** Create separate bookings for each venue.

---

## 🎨 Visual UI Indicators

### Full Venue Selection:
When you select **Prime Space ONLY**, the system shows:

```
┌──────────────────────────────────────┐
│ ✓ Full venue booking                 │
│ All sub-spaces will be blocked       │
└──────────────────────────────────────┘
```

### Partial Venue Selection:
When you select **Prime Space + Sub Space**, the system shows:

```
┌──────────────────────────────────────┐
│ ✓ Partial booking                    │
│ Other sub-spaces remain available    │
└──────────────────────────────────────┘
```

---

## 📞 Step-by-Step Walkthrough

### Scenario: Customer calls and asks for "Marquee 1"

**Front Office Staff should ask:**

**Question 1:** "Do you need the FULL Marquee 1 or just a PART of it?"

#### If customer says "Full Marquee 1":
1. Select Venue: Aiwan-e-Akbari
2. Select Prime Space: Marquee 1
3. **Leave Sub Space EMPTY**
4. Enter guest count (should be 400-800)
5. System confirms: "✓ Full venue booking"

#### If customer says "Just the smaller section":
1. Select Venue: Aiwan-e-Akbari
2. Select Prime Space: Marquee 1
3. Select Sub Space: M1-A or M1-B (based on capacity needed)
4. Enter guest count (should be 150-400)
5. System confirms: "✓ Partial booking"

---

## 💡 Pro Tips

### Tip 1: Check Capacity First
- **Full Marquee 1:** 800 guests
- **M1-A:** 250 guests
- **M1-B:** 400 guests

If customer says "300 guests", recommend **M1-B** (partial booking).

### Tip 2: Cost Optimization
Sometimes booking **M1-A + M1-B separately** (PKR 50,000 + PKR 60,000 = PKR 110,000) might cost MORE than booking **full Marquee 1** (PKR 100,000). 

**Suggestion:** If customer needs both sub-spaces, offer full venue booking!

### Tip 3: Calendar Check
Before offering options, check the **Event Availability Calendar**:
- If M1-A is already booked → Marquee 1 (full) is blocked
- Offer M1-B (if available) or suggest different date

---

## 🔍 Troubleshooting

### Problem: "I selected Prime Space but can't proceed"
**Solution:** Check if you need to select Sub Space or leave it empty based on booking type.

### Problem: "Sub Space dropdown is disabled"
**Solution:** First select a Prime Space. Sub Spaces are only available after Prime Space selection.

### Problem: "Customer wants Marquee 1 + Marquee 2"
**Solution:** Create two separate bookings:
1. First booking: Marquee 1
2. Second booking: Marquee 2
3. Link both bookings to same customer record

---

## ✅ Summary

**To book FULL venue:**
- Select Prime Space ✓
- Leave Sub Space EMPTY ❌

**To book PARTIAL venue:**
- Select Prime Space ✓
- Select Sub Space ✓

**To book MULTIPLE venues:**
- Create SEPARATE bookings for each venue

---

## 📚 Related Documentation

- **Venue Rules Documentation:** `/src/app/components/calendar/VENUE_RULES.md`
- **Implementation Summary:** `/VENUE_RULES_IMPLEMENTATION_SUMMARY.md`
- **Booking Process Guide:** (In New Reservation Dialog)

---

**Last Updated:** January 15, 2026  
**System Version:** VenueOps ERP v2.0
