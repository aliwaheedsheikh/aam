Design ONE unified Confirmed Reservation Form interface for a Banquet ERP system.

IMPORTANT SYSTEM RULES:

This is NOT a standalone booking form.
This screen is the central workspace connected with Kitchen, Accounts, Inventory, CRM, and Master Setup modules.

Do NOT generate multiple layouts.
Do NOT generate alternate versions.
Do NOT generate separate pages for cancellation or shifting events.
Use tabs inside one structured interface.

Optimize layout for 14-inch laptop screen (1366x768).
Allow horizontal expansion for 27-inch displays.
Allow simplified viewing mode for tablets.

The form must support fast front-desk data entry while customer is present.

--------------------------------------------------

ADD A STICKY BOOKING SUMMARY HEADER AT TOP

Header Row 1:

Customer Name
Event Date
Venue
Slot
Guaranteed Guests

Header Row 2:

Grand Total
Advance Received
Remaining Balance
Booking Status
Minimum Advance Required Indicator

Header must remain visible while switching tabs.

--------------------------------------------------

LEFT SIDEBAR STRUCTURE (conversation-based order)

Customer Information
Event Details
Venue Selection
Guest Count & Menu Charges
Food Supplies
RCS Services
Setup & Integrations
Miscellaneous Charges
Payment Ledger
Call-Back Tracking
Change History Log
Final Summary
Shift Event
Cancellation Details

Sidebar width: 260px fixed

--------------------------------------------------

STYLE REQUIREMENTS

Professional enterprise ERP style
Clean neutral colors
Light grey background
White panels
Compact spacing
Table-based entry layout
Minimal icons
No decorative elements
No modal windows
No extra screens

--------------------------------------------------

CUSTOMER INFORMATION SECTION

Fields:

Customer Name
Primary Phone Number
Secondary Phone Number
Address
Reference Source
Referred By Customer
Remarks

When phone number entered:

Auto-check customer database

If existing customer found display:

Previous Events Count
Last Event Date
Preferred Venue
Lifetime Booking Value
Referral Contribution

--------------------------------------------------

EVENT DETAILS SECTION

Fields:

Event Type
Event Date
Event Time Slot
Event Duration
Booking Manager Name

--------------------------------------------------

VENUE SELECTION SECTION

Fields:

Prime Venue Selection
Sub Venue Selection
Venue Mode (Full / Half)

Include button:

Check Availability

System must validate venue conflicts before confirmation.

--------------------------------------------------

GUEST COUNT AND MENU CHARGES SECTION

Fields:

Guaranteed Guests
Expected Guests
Menu Package Selection
Per Head Rate
Auto-calculated Menu Total

Menu must load from Kitchen Module.

--------------------------------------------------

FOOD SUPPLIES SECTION

Editable itemized table connected with kitchen support items.

Example:

Salad Bar
Sweet Dish
Soft Drinks
Tea
Special Counters

--------------------------------------------------

RCS SERVICES SECTION

Load services from Master Setup database.

Selectable services:

Stage Decor
Entrance Gate
Walkway
Sofa Setup
DJ Sound
Follow Lights
Cool Fire
LED Screen
Floral Decor
Photography

Each service loads price automatically.

--------------------------------------------------

SETUP AND INTEGRATIONS SECTION

Show integration indicators:

Menu linked with Kitchen Module
Services linked with Master Setup
Breakage tracking linked with Inventory Module
Payments linked with Accounts Module
Customer history linked with CRM Module

Display customer event history table:

Date
Event Type
Venue
Guests
Booking Value

Display referral statistics:

Total Events Referred
Total Revenue Generated

--------------------------------------------------

MISCELLANEOUS CHARGES SECTION

Allow dynamic row addition:

Item
Quantity
Rate
Total

--------------------------------------------------

PAYMENT LEDGER SECTION

Structured table:

Date
Installment Type
Amount
Method
Received By
Remarks

Auto-calculate:

Total Booking Value
Total Received
Remaining Balance

Always show totals panel at bottom.

--------------------------------------------------

CALL-BACK TRACKING SECTION

Checklist table:

Minimum Advance Received
Menu Finalization Pending
Guest Count Confirmation Pending
RCS Confirmation Pending
Final Payment Reminder Pending

--------------------------------------------------

CHANGE HISTORY LOG SECTION

Auto-record changes table:

Date
Field Changed
Old Value
New Value
Updated By

--------------------------------------------------

FINAL SUMMARY SECTION

Display:

Menu Charges
Hall Charges
RCS Charges
Misc Charges

Grand Total
Advance Received
Remaining Balance
Booking Status Indicator

--------------------------------------------------

SHIFT EVENT TAB

Auto-load existing reservation snapshot:

Current Venue
Current Date
Current Slot
Guests
Advance Received

Allow editing:

New Event Date
New Slot
New Prime Venue
New Sub Venue
Shift Reason

Include buttons:

Check Availability
Shift Transfer Reservation

System must prevent invalid transfers.

--------------------------------------------------

CANCELLATION DETAILS TAB

Fields:

Cancellation Date
Cancelled By
Cancellation Reason
Advance Received

Refund Type:

Full Refund
Partial Refund
Adjust Next Event
Non-Refundable

Refund Amount
Deduction Reason
Refund Method

Refund Processing Log Table:

Date
Amount
Method
Processed By

--------------------------------------------------

SYSTEM ARCHITECTURE RULE

Keep everything inside one reservation workspace.

Do not duplicate functionality from:

Kitchen Module
Accounts Module
Inventory Module
Customer Database Module
Master Setup Module

Instead show integration indicators with those modules.

This screen must operate as the central confirmed reservation control interface of the Banquet ERP.