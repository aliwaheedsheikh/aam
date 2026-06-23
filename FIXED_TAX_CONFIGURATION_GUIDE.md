# Fixed-Value Tax Configuration Guide
## VenueOps ERP - Tax on Fixed Venue Charges with Service Exemptions

## Overview

The **Fixed-Value Tax Configuration** system is designed for banquet venues that charge a fixed venue fee and outsource most services to third-party vendors. This tax model ensures:

✅ Tax calculated **ONLY** on the fixed venue charge  
✅ Outsourced services (menu, décor, lights, etc.) are **TAX-EXEMPT**  
✅ WHT deposited in guest's name against CNIC  
✅ Tax receipts show only the fixed taxable amount  
✅ Compliance with tax regulations  

## Business Scenario

### Your Business Model
```
Total Bill to Guest: PKR 500,000
├─ Fixed Venue Charge: PKR 100,000 (TAXABLE)
│  ├─ PRA Tax (5%): PKR 5,000
│  └─ WHT (10%): PKR 10,000
└─ Outsourced Services: PKR 400,000 (TAX EXEMPT)
   ├─ Menu & Catering
   ├─ Décor & Lights
   ├─ Generator
   ├─ Crockery & Cutlery
   └─ Other Services
```

### Tax Receipt Shows
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         TAX INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fixed Venue Charge:  PKR 100,000
PRA Tax (5%):        PKR   5,000
WHT (10%):           PKR  10,000
─────────────────────────────────
Total Tax:           PKR  15,000
Grand Total:         PKR 115,000

Guest CNIC: 12345-1234567-1
WHT deposited in guest's name
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Configuration Setup

### Location in System
```
Master Setup → Financial Rules → Tax Configuration → Fixed-Value Tax Model
```

### Step 1: Create New Tax Configuration

1. Click "New Configuration" button
2. Enter Configuration Name (e.g., "PKR 100,000 Fixed Tax Model")
3. Set Description explaining the model

### Step 2: Configure Fixed Charge & Tax Rates

| Field | Value | Description |
|-------|-------|-------------|
| **Fixed Venue Charge** | 50,000 or 100,000 | The base amount for taxation |
| **PRA Tax Rate** | 5% | Punjab Restaurant Association tax |
| **WHT Rate** | 10% | Withholding Tax rate |
| **Require CNIC** | ✓ Enabled | CNIC required for WHT deposit |

### Step 3: Set Service Category Exemptions

Mark the following services as **TAX EXEMPT**:

- ✅ **Menu & Catering** - Outsourced to caterers
- ✅ **Decoration** - Third-party decorators
- ✅ **Lighting** - External lighting vendors
- ✅ **Generator** - Power rental services
- ✅ **Crockery & Cutlery** - Tableware rental
- ✅ **Furniture** - Tables/chairs rental
- ✅ **Sound System** - DJ/audio services

Only **Venue Charges** should remain TAXABLE.

### Step 4: Set Application Type

| Type | Usage |
|------|-------|
| **Global** | Apply to all bookings |
| **Venue** | Apply to specific venue only |
| **Prime Space** | Apply to specific hall/space |
| **Event Type** | Apply to specific events (e.g., weddings) |

### Step 5: Activate

Toggle "Active Status" to enable the configuration.

## Tax Calculation Examples

### Example 1: PKR 50,000 Fixed Model

```javascript
Fixed Venue Charge:          PKR  50,000
PRA Tax (5% of 50,000):      PKR   2,500
WHT (10% of 50,000):         PKR   5,000
─────────────────────────────────────────
Total Tax:                   PKR   7,500
Amount to Collect:           PKR  57,500
─────────────────────────────────────────
Guest CNIC: Required for WHT deposit
```

### Example 2: PKR 100,000 Fixed Model

```javascript
Fixed Venue Charge:          PKR 100,000
PRA Tax (5% of 100,000):     PKR   5,000
WHT (10% of 100,000):        PKR  10,000
─────────────────────────────────────────
Total Tax:                   PKR  15,000
Amount to Collect:           PKR 115,000
─────────────────────────────────────────
Guest CNIC: Required for WHT deposit
```

### Full Booking Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           BOOKING INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Event: Wedding Reception
Date: February 14, 2025
Guest Count: 500 persons

CHARGES:
─────────────────────────────────────────
1. Fixed Venue Charge     PKR 100,000 ✓
   - PRA Tax (5%)         PKR   5,000
   - WHT (10%)            PKR  10,000
   ─────────────────────────────────────
   Subtotal:              PKR 115,000

2. Menu Package           PKR 350,000 ✗
   (PKR 700 × 500 guests)
   Tax: EXEMPT (Outsourced)

3. Décor & Lighting       PKR  80,000 ✗
   Tax: EXEMPT (Outsourced)

4. DJ & Sound System      PKR  40,000 ✗
   Tax: EXEMPT (Outsourced)

5. Generator              PKR  25,000 ✗
   Tax: EXEMPT (Outsourced)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL PAYABLE:            PKR 610,000
  - Venue + Tax:          PKR 115,000
  - Outsourced Services:  PKR 495,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TAX BREAKDOWN:
  Base (Taxable):         PKR 100,000
  PRA Tax (5%):           PKR   5,000
  WHT (10%):              PKR  10,000
  Total Tax Collected:    PKR  15,000

Guest CNIC: 12345-1234567-1
WHT deposited in guest's name for tax claim
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## CNIC & WHT Process

### Why CNIC is Required

Withholding Tax (WHT) is deposited with the tax authorities **in the guest's name** against their CNIC number. This allows the guest to:

1. **Claim the WHT** as advance tax payment
2. **Offset it** against their annual tax liability
3. **Get credit** for tax already paid
4. **Reduce** their final tax payment

### Data Collection in Booking

When creating a booking with Fixed Tax Model:

```typescript
Guest Information Required:
├─ Full Name: "Ahmed Khan"
├─ CNIC Number: "12345-1234567-1" ← MANDATORY for WHT
├─ Contact: "+92-300-1234567"
└─ Address: For tax receipt

Tax Calculation:
├─ Fixed Venue Charge: PKR 100,000
├─ PRA Tax (5%): PKR 5,000
├─ WHT (10%): PKR 10,000 ← Deposited against CNIC
└─ Total: PKR 115,000
```

### Tax Receipt Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      TAX WITHHOLDING RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Taxpayer Details:
Name: Ahmed Khan
CNIC: 12345-1234567-1

Service Provider:
Grand Palace Banquet
NTN: 1234567-8

Transaction Details:
Fixed Venue Charge:  PKR 100,000
PRA Tax (5%):        PKR   5,000
WHT (10%):           PKR  10,000
─────────────────────────────────
Total:               PKR 115,000

WHT Amount: PKR 10,000
Deposited in name of taxpayer
CNIC: 12345-1234567-1

This amount can be claimed as
advance tax payment.

Date: [Date]
Signature: _____________
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Integration with Master Data

The Fixed Tax Configuration integrates seamlessly with:

### 1. Venue Master Setup
- Assign specific tax models to venues
- Different venues can have different fixed amounts

### 2. Prime Space Setup
- Apply tax models to specific halls/spaces
- PKR 50,000 for smaller halls
- PKR 100,000 for larger halls

### 3. Event Types
- Apply different tax models to event types
- Weddings: PKR 100,000 fixed charge
- Corporate: PKR 50,000 fixed charge

### 4. Booking System
- Automatically applies correct tax model
- Validates CNIC if WHT is applicable
- Generates proper tax receipts

## Service Category Exemption Logic

### How It Works

```javascript
// Booking Calculation
Total = Fixed Venue Charge + Outsourced Services

// Tax Calculation (ONLY on fixed charge)
PRA Tax = Fixed Charge × (PRA Rate / 100)
WHT = Fixed Charge × (WHT Rate / 100)
Total Tax = PRA Tax + WHT

// Services marked as "exempt" are not included in tax base
Menu Cost: PKR 350,000 → NO TAX
Décor Cost: PKR 80,000 → NO TAX
Fixed Venue: PKR 100,000 → TAX APPLIED ✓
```

### In the System

When adding services to a booking:

```typescript
if (service.category === 'venue') {
  // Apply tax
  taxableAmount += service.amount;
} else {
  // Service is exempt (menu, décor, etc.)
  exemptAmount += service.amount;
}

// Calculate tax only on taxableAmount
const praTax = (taxableAmount * praTaxRate) / 100;
const wht = (taxableAmount * whtRate) / 100;
const totalTax = praTax + wht;
```

## Benefits of This Model

### For the Venue
✅ **Simplified Tax Compliance** - Only venue charge is taxed  
✅ **Clear Separation** - Outsourced services not your tax responsibility  
✅ **Easy Accounting** - Fixed amount makes calculations simple  
✅ **Audit Trail** - Proper documentation for tax authorities  

### For the Guest
✅ **Tax Credit** - WHT deposited in their name for claims  
✅ **Transparency** - Clear breakdown of taxable vs. exempt  
✅ **CNIC-based Record** - Proof of tax payment  
✅ **Advance Tax Benefit** - Can offset against annual liability  

### For Compliance
✅ **Regulatory Compliance** - Meets tax authority requirements  
✅ **Proper Documentation** - Tax receipts with CNIC  
✅ **Audit-Ready** - Clear records of tax collection and deposit  
✅ **Guest Protection** - Proper WHT credits for guests  

## Multiple Configuration Support

You can create **multiple** fixed tax configurations:

### Configuration 1: Standard Model
- Fixed Charge: PKR 50,000
- PRA: 5%, WHT: 10%
- Applied to: Small halls

### Configuration 2: Premium Model
- Fixed Charge: PKR 100,000
- PRA: 5%, WHT: 10%
- Applied to: Large halls

### Configuration 3: Corporate Model
- Fixed Charge: PKR 75,000
- PRA: 5%, WHT: 12%
- Applied to: Corporate events

The system automatically selects the applicable configuration based on:
1. Venue selected
2. Space selected
3. Event type
4. Priority rules

## Reporting & Analytics

### Tax Reports Generated

1. **WHT Summary Report**
   - Guest Name, CNIC, WHT Amount
   - For government submission

2. **PRA Tax Report**
   - Total PRA tax collected
   - For Punjab Restaurant Association

3. **Tax-Exempt Services Report**
   - Total value of outsourced services
   - Breakdown by category

4. **Monthly Tax Summary**
   - Total fixed charges
   - Total tax collected
   - Number of bookings

## Next Steps

1. ✅ **Setup Complete** - Fixed Tax Configuration created
2. ✅ **Service Categories Configured** - Exemptions set
3. ➡️ **Integrate with Booking System** - Apply tax model to bookings
4. ➡️ **CNIC Validation** - Require CNIC for WHT bookings
5. ➡️ **Generate Tax Receipts** - Print proper tax invoices
6. ➡️ **Monthly Reports** - Submit tax returns

---

**Created**: January 2026  
**Purpose**: Simplified tax compliance for venues with outsourced services  
**Benefit**: Clear separation of taxable venue charges vs. exempt services
