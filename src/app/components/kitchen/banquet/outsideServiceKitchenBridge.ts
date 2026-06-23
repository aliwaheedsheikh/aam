import { Booking, BookingAgreementSnapshot, BookingStatus, ReservationAdditionalCharge } from '../../calendar/types-v2';
import { ServiceBooking } from '../../calendar/service-types';

const OUTSIDE_SERVICES_VENUE_ID = 'outside-services';

const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateInput = (value: Date | string | undefined) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDate = (value: Date | string | undefined) => {
  if (value instanceof Date) return value;
  if (value) return new Date(value);
  return new Date();
};

const mapServiceStatusToBookingStatus = (status?: string): BookingStatus => {
  switch (status) {
    case 'cancelled':
      return 'cancelled';
    case 'completed':
      return 'completed';
    default:
      return 'confirmed';
  }
};

const getSourcePayload = (booking: ServiceBooking) => booking as ServiceBooking & Record<string, any>;

const getCateringLines = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  return Array.isArray(payload.cateringItems) ? payload.cateringItems : [];
};

const getFoodSupplyLines = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  return Array.isArray(payload.foodSupplies) ? payload.foodSupplies : [];
};

const getRcsLines = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  return Array.isArray(payload.rcsServices) ? payload.rcsServices : [];
};

const getMiscCharges = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  return Array.isArray(payload.miscCharges) ? payload.miscCharges : [];
};

const getAdditionalChargeLines = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  return Array.isArray(payload.additionalCharges) ? payload.additionalCharges : getMiscCharges(booking);
};

const getAdditionalChargeLineTotal = (line: Record<string, any>) =>
  safeNumber(line.total ?? line.amount ?? safeNumber(line.quantity || 1) * safeNumber(line.rate));

const getAdditionalChargeLineRate = (line: Record<string, any>) => {
  const quantity = safeNumber(line.quantity || 1) || 1;
  if (line.rate !== undefined) return safeNumber(line.rate);
  return getAdditionalChargeLineTotal(line) / quantity;
};

const buildAdditionalChargeItems = (booking: ServiceBooking): ReservationAdditionalCharge[] => {
  const payload = getSourcePayload(booking);
  const timestamp = payload.updatedAt || payload.createdAt || booking.createdAt.toISOString();

  return getAdditionalChargeLines(booking).map((line: Record<string, any>, index: number) => {
    const quantity = safeNumber(line.quantity || 1) || 1;
    const rate = getAdditionalChargeLineRate(line);
    const total = safeNumber(line.total ?? quantity * rate);
    const chargeName =
      line.customChargeName ||
      line.chargeType ||
      line.chargeTypeName ||
      line.label ||
      line.item ||
      'Additional Charge';

    return {
      id: line.id || `${booking.id}-additional-charge-${index + 1}`,
      additionalChargeTypeId: line.additionalChargeTypeId,
      customChargeName: chargeName,
      description: line.description || line.notes || chargeName,
      quantity,
      rate,
      total,
      notes: line.notes || '',
      createdAt: line.createdAt || timestamp,
      updatedAt: line.updatedAt || timestamp,
    };
  });
};

const getPayments = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  return Array.isArray(payload.payments) ? payload.payments : [];
};

const computeOrderTotals = (booking: ServiceBooking) => {
  const foodSupplyTotal = getFoodSupplyLines(booking).reduce(
    (sum, line) => sum + safeNumber(line.total ?? safeNumber(line.quantity) * safeNumber(line.rate)),
    0,
  );
  const cateringTotal = getCateringLines(booking).reduce(
    (sum, line) => sum + safeNumber(line.total ?? safeNumber(line.guestCount) * safeNumber(line.rate)),
    0,
  );
  const rcsTotal = getRcsLines(booking).reduce(
    (sum, line) => sum + safeNumber(line.total ?? safeNumber(line.quantity) * safeNumber(line.charges)),
    0,
  );
  const miscTotal = getAdditionalChargeLines(booking).reduce((sum, line) => sum + getAdditionalChargeLineTotal(line), 0);
  const grandTotal =
    safeNumber(booking.totalAmount) || foodSupplyTotal + cateringTotal + rcsTotal + miscTotal;
  const paidAmount =
    safeNumber(booking.paidAmount) ||
    getPayments(booking).reduce((sum, line) => sum + safeNumber(line.amount), 0);

  return {
    foodSupplyTotal,
    cateringTotal,
    rcsTotal,
    miscTotal,
    grandTotal,
    paidAmount,
    balance: Math.max(grandTotal - paidAmount, 0),
  };
};

const getGuestCount = (booking: ServiceBooking) => {
  const cateringGuests = getCateringLines(booking).reduce(
    (sum, line) => sum + safeNumber(line.guestCount),
    0,
  );
  return safeNumber(booking.guestCount) || cateringGuests;
};

const getPrimaryPackage = (booking: ServiceBooking) => {
  const payload = getSourcePayload(booking);
  const cateringLines = getCateringLines(booking);
  const linkedPackage = cateringLines.find((line) => line.packageId || line.packageName);
  if (linkedPackage) {
    return linkedPackage;
  }

  if (payload.menuType || payload.packageName) {
    return {
      packageId: payload.menuPackageId || payload.packageId,
      packageName: payload.packageName || payload.menuType,
      guestCount: getGuestCount(booking),
      rate: safeNumber(payload.menuRate),
      total: safeNumber(payload.menuTotal),
    };
  }

  return null;
};

const buildAgreementSnapshot = (booking: ServiceBooking): BookingAgreementSnapshot => {
  const payload = getSourcePayload(booking);
  const supplyDate = payload.supplyDate || formatDateInput(booking.date);
  const guestCount = getGuestCount(booking);
  const primaryPackage = getPrimaryPackage(booking);
  const totals = computeOrderTotals(booking);
  const menuMode = primaryPackage ? 'package' : 'custom';
  const menuLabel =
    primaryPackage?.packageName ||
    payload.supplyType ||
    payload.eventType ||
    booking.serviceType;
  const additionalChargeItems = buildAdditionalChargeItems(booking);

  return {
    customer: {
      customerId: payload.customerId,
      name: booking.customerName,
      primaryPhone: booking.contactNumber || '',
      secondaryPhone: payload.secondaryPhone || '',
      address: payload.address || payload.supplyLocation || payload.deliveryAddress || payload.eventLocation || '',
      area: payload.area || payload.supplyArea || payload.deliveryArea || payload.eventArea || '',
      city: payload.city || payload.deliveryCity || payload.eventCity || 'Lahore',
      referenceSource: payload.referenceSource || payload.bookingSource || 'Outside Services',
      referredBy: payload.reference || payload.approvedBy || payload.creditReference || '',
      remarks: payload.remarks || booking.notes || '',
    },
    event: {
      eventType: payload.supplyType || payload.eventType || 'Outside Services',
      date: supplyDate,
      startTime: payload.deliveryTime || booking.startTime,
      endTime: payload.pickupTime || booking.endTime || booking.startTime,
    },
    venue: {
      venueId: OUTSIDE_SERVICES_VENUE_ID,
      venueName: 'Outside Services',
      primeSpaceId: payload.supplyLocation || payload.deliveryAddress || payload.eventLocation || 'dispatch',
      primeSpaceName: payload.supplyLocation || payload.deliveryAddress || payload.eventLocation || 'Dispatch',
      subSpaceId: payload.supplyArea || payload.deliveryArea || payload.eventArea || payload.city || 'external',
      subSpaceName: payload.supplyArea || payload.deliveryArea || payload.eventArea || payload.city || 'External',
      venueMode: 'Full',
    },
    guestGuarantees: {
      guaranteedGuests: guestCount,
      minimumGuaranteedGuests: guestCount,
      expectedGuests: guestCount,
      totalGuests: guestCount,
      menCount: 0,
      ladiesCount: 0,
      kidsCount: 0,
      requiresPartition: false,
    },
    venueCharges: {
      venueRentalCharges: 0,
      additionalHallCharges: 0,
      chargeExtraHours: false,
      extraHourRate: 0,
      total: 0,
    },
    foodAndCatering: {
      menuPackage: primaryPackage?.packageName || '',
      perHeadRate: safeNumber(primaryPackage?.rate),
      menuTotal: totals.cateringTotal,
      supportCateringTotal: 0,
      menuSelection: {
        serviceMode: 'in-house',
        mode: menuMode,
        summaryLabel: menuLabel,
        packageId: primaryPackage?.packageId || payload.menuPackageId || payload.packageId,
        packageName: primaryPackage?.packageName || payload.packageName || payload.menuType,
        guaranteedGuests: guestCount,
        basePerHeadRate: safeNumber(primaryPackage?.rate),
        finalPerHeadRate: safeNumber(primaryPackage?.rate),
        discountAmount: 0,
        discountPercent: 0,
        missingRequirements: [],
        items: [
          ...getFoodSupplyLines(booking).map((line) => ({
            name: line.item,
            kitchenItemId: line.kitchenItemId,
          })),
          ...getCateringLines(booking).map((line) => ({
            name: line.packageName,
            kitchenItemId: line.kitchenItemId,
          })),
        ],
        customerProvidedMenu: [],
        menuTotal: totals.cateringTotal,
      },
      selectedSupportCatering: [],
    },
    foodSupplies: {
      items: getFoodSupplyLines(booking).map((line) => ({
        item: line.item || 'Supply Item',
        quantity: safeNumber(line.quantity),
        unit: line.unit || 'qty',
        rate: safeNumber(line.rate),
      })),
      total: totals.foodSupplyTotal,
    },
    rcs: {
      items: getRcsLines(booking).map((line) => ({
        id: line.id || `${booking.id}-rcs`,
        source: 'In-house' as const,
        serviceName: line.serviceType || 'RCS Service',
        quantity: safeNumber(line.quantity),
        price: safeNumber(line.charges),
        notes: line.notes || '',
      })),
      total: totals.rcsTotal,
    },
    additionalCharges: {
      items: additionalChargeItems,
      total: totals.miscTotal,
    },
    miscCharges: {
      items: additionalChargeItems.map((line) => ({
        item: line.customChargeName || line.description || 'Additional Charge',
        quantity: safeNumber(line.quantity),
        rate: safeNumber(line.rate),
      })),
      total: totals.miscTotal,
    },
    taxes: {
      total: 0,
    },
    discounts: {
      amount: 0,
      percent: 0,
    },
    totals: {
      menuTotal: totals.cateringTotal,
      foodSuppliesTotal: totals.foodSupplyTotal,
      supportCateringTotal: 0,
      rcsTotal: totals.rcsTotal,
      additionalChargesTotal: totals.miscTotal,
      miscTotal: totals.miscTotal,
      taxTotal: 0,
      grandTotal: totals.grandTotal,
      paidAmount: totals.paidAmount,
      balance: totals.balance,
    },
    paymentTerms: {
      advanceReceived: totals.paidAmount,
      advanceReceivedOn: getPayments(booking)[0]?.date,
      receivedPayments: totals.paidAmount,
      totalReceived: totals.paidAmount,
      minimumAdvance: 0,
      minimumAdvanceSource: 'outside-services-order',
      remainingCommitment: 0,
      totalPlannedAdvance: totals.paidAmount,
      isMinimumAdvanceMet: true,
      paymentPlanEntries: [],
      finalClearance: {
        dueDate: supplyDate,
        status: totals.balance > 0 ? 'Planned' : 'Received',
        notes: 'Balance remains payable after supply completion.',
      },
      payments: getPayments(booking).map((payment) => ({
        id: payment.id || `${booking.id}-payment`,
        date: payment.date || supplyDate,
        amount: safeNumber(payment.amount),
        paymentMethod:
          payment.method === 'Cheque'
            ? 'Cheque'
            : payment.method === 'Credit Card'
              ? 'Credit Card'
              : payment.method === 'Bank Transfer' || payment.method === 'Online'
                ? 'Online Transfer'
                : 'Cash',
        transactionRef: payment.reference || '',
        remarks: payment.notes || '',
        receivedBy: 'Outside Services',
        createdAt: payment.date || supplyDate,
      })),
    },
  };
};

const isKitchenRelevantOutsideService = (booking: ServiceBooking) => {
  if (booking.status === 'cancelled') {
    return false;
  }

  const payload = getSourcePayload(booking);
  const hasFoodContent =
    getFoodSupplyLines(booking).length > 0 ||
    getCateringLines(booking).length > 0 ||
    payload.serviceType === 'food-supply' ||
    payload.serviceType === 'outdoor-catering';

  return hasFoodContent;
};

export const buildKitchenPlanningBookingsFromServiceBookings = (
  serviceBookings: ServiceBooking[],
): Booking[] =>
  serviceBookings
    .filter((booking) => isKitchenRelevantOutsideService(booking))
    .map((booking) => {
      const payload = getSourcePayload(booking);
      const totals = computeOrderTotals(booking);
      const agreementSnapshot = buildAgreementSnapshot(booking);
      const eventDate = toDate(payload.supplyDate || booking.date);

      return {
        id: booking.id,
        venueId: OUTSIDE_SERVICES_VENUE_ID,
        primeSpaceId: payload.supplyLocation || 'dispatch',
        subSpaceId: payload.supplyArea || payload.city || 'external',
        date: eventDate,
        startTime: payload.deliveryTime || booking.startTime,
        endTime: payload.pickupTime || booking.endTime || booking.startTime,
        status: mapServiceStatusToBookingStatus(booking.status),
        customerId: payload.customerId,
        customerName: booking.customerName,
        guestCount: getGuestCount(booking),
        contactNumber: booking.contactNumber || '',
        secondaryPhone: payload.secondaryPhone || '',
        address: payload.address || payload.supplyLocation || payload.deliveryAddress || payload.eventLocation || '',
        area: payload.area || payload.supplyArea || payload.deliveryArea || payload.eventArea || '',
        city: payload.city || payload.deliveryCity || payload.eventCity || 'Lahore',
        referenceSource: payload.referenceSource || payload.bookingSource || 'Outside Services',
        referredBy: payload.reference || payload.approvedBy || payload.creditReference || '',
        customerRemarks: payload.remarks || '',
        bookingSource: 'Outside Services',
        notes: payload.internalNotes || booking.notes || payload.deliveryInstructions || '',
        createdAt: toDate(booking.createdAt),
        eventType: payload.supplyType || payload.eventType || 'Outside Services',
        venueName: 'Outside Services',
        primeSpaceName: payload.supplyLocation || payload.deliveryAddress || payload.eventLocation || 'Dispatch',
        subSpaceName: payload.supplyArea || payload.deliveryArea || payload.eventArea || payload.city || 'External',
        totalAmount: totals.grandTotal,
        paidAmount: totals.paidAmount,
        balance: totals.balance,
        agreementStatus: 'Signed',
        currentAgreementSnapshot: agreementSnapshot,
        signedAgreementSnapshot: agreementSnapshot,
        agreementSignedAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
        agreementSignedBy: 'Outside Services',
      };
    });
