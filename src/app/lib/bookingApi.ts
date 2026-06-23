import { Booking } from "@/app/components/calendar/types-v2";
import { fetchApi } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";

const authorizedHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

const buildApiError = async (response: Response, fallbackMessage: string) => {
  let description = fallbackMessage;

  try {
    const payload = await response.json();
    if (typeof payload?.message === "string" && payload.message.trim()) {
      description = payload.message;
    } else if (Array.isArray(payload?.message) && payload.message.length > 0) {
      description = payload.message.join(", ");
    }
  } catch {
    // Ignore non-JSON error bodies and fall back to the default message.
  }

  return new Error(description);
};

const toSerializableBooking = (booking: Booking) => ({
  ...booking,
  date: booking.date instanceof Date ? booking.date.toISOString() : booking.date,
  createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
  callbackDate: booking.callbackDate instanceof Date ? booking.callbackDate.toISOString() : booking.callbackDate,
  approvalDate: booking.approvalDate instanceof Date ? booking.approvalDate.toISOString() : booking.approvalDate,
  gracePeriodEndDate:
    booking.gracePeriodEndDate instanceof Date
      ? booking.gracePeriodEndDate.toISOString()
      : booking.gracePeriodEndDate,
  confirmationRequestedAt:
    booking.confirmationRequestedAt instanceof Date
      ? booking.confirmationRequestedAt.toISOString()
      : booking.confirmationRequestedAt,
  confirmationDeadline:
    booking.confirmationDeadline instanceof Date
      ? booking.confirmationDeadline.toISOString()
      : booking.confirmationDeadline,
  releasedAt: booking.releasedAt instanceof Date ? booking.releasedAt.toISOString() : booking.releasedAt,
});

export const bookingApi = {
  async fetchBookings() {
    const response = await fetchApi("/bookings/frontend", {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw await buildApiError(response, `Failed to load bookings from API (${response.status})`);
    }

    return (await response.json()) as Booking[];
  },

  async syncBookings(bookings: Booking[]) {
    const response = await fetchApi("/bookings/frontend-sync", {
      method: "PUT",
      headers: authorizedHeaders(),
      body: JSON.stringify({
        bookings: bookings.map(toSerializableBooking),
      }),
    });

    if (!response.ok) {
      throw await buildApiError(response, `Failed to sync bookings to API (${response.status})`);
    }

    return (await response.json()) as Booking[];
  },

  async createBooking(booking: Booking) {
    const response = await fetchApi("/bookings/frontend", {
      method: "POST",
      headers: authorizedHeaders(),
      body: JSON.stringify(toSerializableBooking(booking)),
    });

    if (!response.ok) {
      throw await buildApiError(response, `Failed to create booking in API (${response.status})`);
    }

    return (await response.json()) as Booking;
  },

  async updateBooking(id: string, booking: Booking) {
    const response = await fetchApi(`/bookings/frontend/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authorizedHeaders(),
      body: JSON.stringify(toSerializableBooking(booking)),
    });

    if (!response.ok) {
      throw await buildApiError(response, `Failed to update booking in API (${response.status})`);
    }

    return (await response.json()) as Booking;
  },

  async deleteBooking(id: string) {
    const response = await fetchApi(`/bookings/frontend/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw await buildApiError(response, `Failed to delete booking in API (${response.status})`);
    }

    return (await response.json()) as { deleted: boolean; id: string };
  },
};
