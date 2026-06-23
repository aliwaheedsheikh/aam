// Updated types for Venue → Prime Space → Sub Space calendar system

export type BookingStatus = 'draft' | 'price_quoted' | 'tentative' | 'confirmed' | 'completed' | 'cancelled' | 'expired' | 'lost-space-taken';

// Booking mode for forms
export type BookingMode = 
  | 'create-tentative'    // Normal tentative creation
  | 'edit-tentative'      // Edit existing tentative
  | 'edit-confirmed'      // Edit existing confirmed
  | 'direct-confirm'      // Walk-in direct confirmation (bypass tentative)
  | 'convert-tentative';  // Converting tentative to confirmed

export interface Venue {
  id: string;
  name: string;
  location: string;
}

export interface SubSpace {
  id: string;
  name: string;
  capacity: number;
  primeSpaceId: string;
}

export interface PrimeSpace {
  id: string;
  name: string;
  venueId: string;
  capacity: number;
  subSpaces: SubSpace[];
}

export interface BookingSpaceAssignment {
  venueId?: string;
  primeSpaceId: string;
  subSpaceId?: string;
  assignmentType: 'PRIME_FULL' | 'SUB_ONLY';
  usageLabel?: string;
  guestCount?: number;
  sortOrder?: number;
}

export type BookingAgreementStatus = 'Draft' | 'Signed' | 'Re-sign Required';

export interface BookingAgreementChangeEntry {
  field: string;
  section?: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface AdditionalChargeType {
  id: string;
  name: string;
  defaultRate: number;
  unitType: string;
  defaultDescription: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationAdditionalCharge {
  id: string;
  additionalChargeTypeId?: string;
  customChargeName?: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerChargeLedgerEntry {
  id: string;
  source: 'additional-charge';
  sourceId: string;
  entryType: 'debit';
  description: string;
  debit: number;
  credit: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingAgreementSnapshot {
  customer: {
    customerId?: string;
    name: string;
    primaryPhone: string;
    secondaryPhone?: string;
    address?: string;
    area?: string;
    city?: string;
    referenceSource?: string;
    referredBy?: string;
    remarks?: string;
  };
  event: {
    eventType?: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  venue: {
    venueId: string;
    venueName?: string;
    primeSpaceId?: string;
    primeSpaceName?: string;
    subSpaceId?: string;
    subSpaceName?: string;
    venueMode?: 'Full' | 'Half';
  };
  guestGuarantees: {
    guaranteedGuests: number;
    minimumGuaranteedGuests: number;
    expectedGuests: number;
    totalGuests: number;
    menCount: number;
    ladiesCount: number;
    kidsCount: number;
    requiresPartition: boolean;
  };
  venueCharges: {
    venueRentalCharges: number;
    additionalHallCharges: number;
    chargeExtraHours: boolean;
    extraHourRate: number;
    total: number;
  };
  foodAndCatering: {
    menuPackage: string;
    perHeadRate: number;
    menuTotal: number;
    supportCateringTotal: number;
    menuSelection: {
      serviceMode: string;
      mode: string;
      summaryLabel: string;
      packageId?: string;
      packageName?: string;
      guaranteedGuests: number;
      basePerHeadRate: number;
      finalPerHeadRate: number;
      pricingMode?: string;
      fixedAmount?: number;
      cateringPerHeadRate?: number;
      discountType?: string;
      discountAmount: number;
      discountPercent: number;
      discountGivenBy?: string;
      discountReason?: string;
      approvedBy?: string;
      completenessOverrideNote?: string;
      missingRequirements: string[];
      items: unknown[];
      customerProvidedMenu: unknown[];
      menuTotal: number;
    };
    selectedSupportCatering: Array<{
      id: string;
      itemName: string;
      pricingType: string;
      quantity: number;
      rate: number;
      inventoryLinked?: boolean;
      kitchenLinked?: boolean;
    }>;
  };
  foodSupplies: {
    items: Array<{
      kitchenItemId?: string;
      masterItemId?: string;
      item: string;
      itemName?: string;
      itemCode?: string;
      quantity: number;
      unit: string;
      rate: number;
      costRate?: number;
    }>;
    total: number;
  };
  rcs: {
    items: Array<{
      id: string;
      source: 'In-house' | 'Outsource';
      serviceName: string;
      quantity: number;
      price: number;
      masterServiceId?: string;
      categoryId?: string;
      categoryName?: string;
      unitType?: string;
      costRate?: number;
      internalCost?: number;
      vendorCost?: number;
      commissionRuleId?: string;
      commissionRuleName?: string;
      vendorName?: string;
      notes?: string;
      description?: string;
      enteredBy?: string;
      reasonNote?: string;
    }>;
    total: number;
  };
  additionalCharges: {
    items: ReservationAdditionalCharge[];
    total: number;
  };
  miscCharges?: {
    items: Array<{
      item: string;
      quantity: number;
      rate: number;
    }>;
    total: number;
  };
  taxes: {
    total: number;
  };
  discounts: {
    type?: string;
    amount: number;
    percent: number;
    givenBy?: string;
    reason?: string;
    approvedBy?: string;
  };
  totals: {
    menuTotal: number;
    foodSuppliesTotal: number;
    supportCateringTotal: number;
    rcsTotal: number;
    additionalChargesTotal: number;
    miscTotal: number;
    taxTotal: number;
    grandTotal: number;
    paidAmount: number;
    balance: number;
  };
  paymentTerms: {
    advanceReceived: number;
    advanceReceivedOn?: string;
    receivedPayments: number;
    totalReceived: number;
    minimumAdvance: number;
    minimumAdvanceSource: string;
    minimumAdvanceNote?: string;
    remainingCommitment: number;
    totalPlannedAdvance: number;
    isMinimumAdvanceMet: boolean;
    advanceExceptionApprovedBy?: string;
    advanceExceptionApprovedAt?: string;
    advanceExceptionReason?: string;
    paymentPlanEntries: Array<{
      id: string;
      label: string;
      amount: number;
      dueDate: string;
      status: 'Planned' | 'Received' | 'Partial';
      notes?: string;
    }>;
    finalClearance: {
      dueDate: string;
      status: 'Planned' | 'Received' | 'Partial';
      notes: string;
    };
    payments: Array<{
      id: string;
      date: string;
      amount: number;
      entryType?: 'Payment' | 'Adjustment' | 'Refund';
      paymentMethod: 'Cash' | 'Online Transfer' | 'Cheque' | 'Credit Card';
      bankName?: string;
      chequeNo?: string;
      encashmentDate?: string;
      cardLastFour?: string;
      cardType?: string;
      transactionRef?: string;
      description?: string;
      referenceLabel?: string;
      fromEventName?: string;
      fromEventDate?: string;
      screenshot?: string;
      receivedBy: string;
      remarks?: string;
      createdAt: string;
      editedBy?: string;
      editedAt?: string;
    }>;
  };
}

export type PostEventFeedbackRating = 'Excellent' | 'Good' | 'Average' | 'Poor';

export type PostEventFeedbackRecommendation = 'Yes' | 'No' | 'Not Asked';

export type PostEventServiceKey =
  | 'venue-charges'
  | 'food-menu'
  | 'support-catering'
  | 'food-supplies'
  | 'rcs-services'
  | 'misc-charges';

export interface PostEventServiceFeedback {
  serviceKey: PostEventServiceKey;
  serviceLabel: string;
  bookedAmount?: number;
  bookedItems?: string[];
  rating?: PostEventFeedbackRating;
  customerComment?: string;
  internalNote?: string;
  issueReported?: boolean;
}

export interface PostEventFeedback {
  overallRating?: PostEventFeedbackRating;
  overallComment?: string;
  wouldRecommend?: PostEventFeedbackRecommendation;
  followUpRequired?: boolean;
  followUpAction?: string;
  serviceFeedback: PostEventServiceFeedback[];
  recordedAt?: string;
  recordedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Booking {
  id: string;
  venueId: string;
  primeSpaceId?: string; // Set if booking single prime space (DEPRECATED - use primeSpaceIds)
  primeSpaceIds?: string[]; // Set if booking one or more prime spaces
  subSpaceId?: string; // Set if booking only a sub space
  spaceAssignments?: BookingSpaceAssignment[];
  date: Date;
  startTime: string; // Format: "HH:MM" (24-hour)
  endTime: string; // Format: "HH:MM" (24-hour)
  status: BookingStatus;
  customerId?: string;
  customerName: string;
  guestCount: number;
  minimumGuaranteedGuests?: number;
  contactNumber?: string;
  customerPhone?: string;
  secondaryPhone?: string;
  address?: string;
  area?: string;
  city?: string;
  referenceSource?: string;
  referredBy?: string;
  customerRemarks?: string;
  callbackDate?: Date;
  followUpStatus?:
    | 'New'
    | 'Contacted'
    | 'Interested'
    | 'Visit Scheduled'
    | 'Negotiation'
    | 'Follow-up Required'
    | 'Converted'
    | 'Lost';
  inquirySource?:
    | 'Walk-in'
    | 'Phone Call'
    | 'WhatsApp'
    | 'Facebook'
    | 'Instagram'
    | 'Google'
    | 'Website'
    | 'Reference'
    | 'Repeat Customer'
    | 'Old Customer'
    | 'Other';
  bookingSource?: string;
  priority?: 'High' | 'Medium' | 'Low';
  notes?: string;
  createdAt?: Date; // When the booking was created
  inquiryDateTime?: Date; // When the inquiry was first received
  inquiryDate?: string;
  confirmationDate?: string;
  customerType?: string; // Walk-in, WhatsApp, Facebook, Google, etc.
  eventType?: string; // Wedding, Birthday, Corporate, etc.
  venueName?: string;
  primeSpaceName?: string;
  primeSpaceNames?: string[];
  subSpaceName?: string;
  isVIPCustomer?: boolean; // VIP/Regular customer who can book without advance
  vipReference?: string; // WHY they're VIP: Director's Relation, FM Referral, Existing Customer, etc.
  queuePosition?: number; // Position in queue for overlapping tentatives
  // Financial fields
  totalAmount?: number;
  paidAmount?: number;
  balance?: number;
  agreementStatus?: BookingAgreementStatus;
  signedAgreementSnapshot?: BookingAgreementSnapshot;
  currentAgreementSnapshot?: BookingAgreementSnapshot;
  agreementSignedAt?: string;
  agreementSignedBy?: string;
  agreementVersion?: number;
  agreementChangeHistory?: BookingAgreementChangeEntry[];
  additionalCharges?: ReservationAdditionalCharge[];
  additionalChargeLedgerEntries?: CustomerChargeLedgerEntry[];
  customerPayableBalance?: number;
  postEventFeedback?: PostEventFeedback;
  // Approval workflow fields
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // For bookings without advance
  approvalType?: 'no-advance' | 'partial-advance'; // Reason for approval
  approvedBy?: string; // GM or Director name
  approvalDate?: Date; // When approved
  gracePeriodDays?: number; // Days allowed to pay (usually 15)
  gracePeriodEndDate?: Date; // Calculated deadline
  approvalNotes?: string; // Conditions set by approver
  // Immediate Confirmation Request fields
  confirmationRequested?: boolean; // True if immediate confirmation was requested
  confirmationRequestedAt?: Date; // When confirmation was requested
  confirmationRequestedBy?: string; // User who triggered the action
  confirmationDeadline?: Date; // Calculated deadline (e.g., 2 hours from request)
  confirmationWindowMinutes?: number; // Duration of confirmation window (default: 120 minutes)
  slotLockedForConfirmation?: boolean; // True if slot is locked during confirmation window
  // Tentative Release fields
  released?: boolean; // True if tentative was released
  releaseReason?: 'declined' | 'no-response' | 'postponed' | 'other'; // Why tentative was released
  releaseNotes?: string; // Additional context for release
  releasedAt?: Date; // When tentative was released
  releasedBy?: string; // User who released the tentative
  releaseAuditLog?: {
    timestamp: string;
    userId: string;
    userName: string;
    reason: string;
    notes?: string;
    customerName: string;
    spaceId: string;
    spaceName: string;
    eventDate: string;
    timeSlot: string;
  }; // Complete audit trail for release
  changeHistory?: Array<{
    timestamp: string;
    field: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    changeType: 'added' | 'removed' | 'modified';
  }>;
}

export interface TimeBlock {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  conflictingBooking?: Booking;
}

// Comprehensive Reservation Type for ERP System
export interface ReservationV2 {
  id: string;
  status: 'tentative' | 'pending_approval' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;

  // Customer Information (Basic for Tentative, Full for Confirmed)
  customerName: string;
  customerType?: string;
  contactNumber: string;
  whatsapp?: string;
  email?: string;
  altContactName?: string;
  altContactNumber?: string;
  cnicNumber?: string;
  companyName?: string;
  address?: string;
  houseStreet?: string;
  area?: string;
  city?: string;
  customerSource?: string;

  // Tentative-specific fields
  bookingSource?: string; // How did they find us (for tentative)
  callBackDate?: string;
  callBackHistory?: Array<{
    date: string;
    time: string;
    notes: string;
    status: string;
  }>;
  reasonNotConfirmed?: string; // Why tentative not yet confirmed
  estimatedAmount?: string; // Rough estimate for tentative
  
  // Tentative pricing tracking (for officer reference)
  foodPreference?: 'with_food' | 'without_food'; // Customer preference
  quotedMenuRate?: string; // Menu rate quoted if with food
  quotedWithoutFoodPrice?: string; // Price quoted if without food
  pricingNotes?: string; // Additional pricing details discussed

  // Event & Reservation Details
  date: string;
  startTime: string;
  endTime: string;
  eventType: string;
  guestCount: number;
  venueId: string;
  primeSpaceId?: string; // Deprecated - for backwards compatibility
  primeSpaceIds: string[];
  subSpaceId?: string;
  tentativeExpiryDate?: string;
  notes?: string;

  // Financial Details (Confirmed only)
  venueFixedAmount?: number;
  praPercentage?: number;
  whtPercentage?: number;
  praTax?: number;
  whtTax?: number;
  totalVenueTax?: number;
  menuTotal?: number;
  grandTotal?: number;
  totalPaid?: number;
  balanceDue?: number;
  payments?: Array<{
    id: string;
    date: string;
    amount: string;
    method: string;
    reference: string;
  }>;
  receivedBy?: string;

  // Approval fields
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  approvingAuthority?: string;

  // CRM / Follow-up & Sales Tracking (Tentative-focused)
  salesFollowUpStatus?: string;
  reasonNotInterested?: string;
  customerRemarks?: string;
  assignedTo?: string;
  followUpReminderDate?: string;
  followUpReminderTime?: string;
  interestedBudget?: string;
  competitorConsidering?: string;
  communicationLogs?: Array<{
    date: string;
    time: string;
    type: 'whatsapp' | 'call' | 'email';
    contactedBy: string;
    notes: string;
  }>;

  // CRM / Post-Booking Operations Follow-Up (Confirmed-focused)
  postBookingStatus?: string;
  pendingItems?: {
    advancePayment: boolean;
    menuFinalization: boolean;
    decorSelection: boolean;
    balancePayment: boolean;
  };
  advanceDueDate?: string;
  menuDueDate?: string;
  decorDueDate?: string;
  balanceDueDate?: string;
  upsellingNotes?: string;
  upsellingOpportunities?: Array<{
    item: string;
    offered: boolean;
    accepted: boolean;
    notes: string;
  }>;

  // Activity & Change History (Auto-tracked)
  changeHistory?: Array<{
    timestamp: string;
    field: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    changeType: 'added' | 'removed' | 'modified';
  }>;
}
