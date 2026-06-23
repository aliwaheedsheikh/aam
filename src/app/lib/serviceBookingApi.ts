import { ServiceBooking } from "@/app/components/calendar/service-types";
import { fetchApi } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";

const authorizedHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

const toSerializableServiceBooking = (booking: ServiceBooking) => ({
  ...booking,
  date: booking.date instanceof Date ? booking.date.toISOString() : booking.date,
  createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
  rentalStartDate:
    "rentalStartDate" in booking && booking.rentalStartDate instanceof Date
      ? booking.rentalStartDate.toISOString()
      : booking.rentalStartDate,
  rentalEndDate:
    "rentalEndDate" in booking && booking.rentalEndDate instanceof Date
      ? booking.rentalEndDate.toISOString()
      : booking.rentalEndDate,
  deliveryDate:
    "deliveryDate" in booking && booking.deliveryDate instanceof Date
      ? booking.deliveryDate.toISOString()
      : booking.deliveryDate,
  pickupDate:
    "pickupDate" in booking && booking.pickupDate instanceof Date
      ? booking.pickupDate.toISOString()
      : booking.pickupDate,
});

export const serviceBookingApi = {
  async fetchServiceBookings() {
    const response = await fetchApi("/service-bookings/frontend", {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load service bookings from API (${response.status})`);
    }

    return (await response.json()) as ServiceBooking[];
  },

  async syncServiceBookings(bookings: ServiceBooking[]) {
    const response = await fetchApi("/service-bookings/frontend-sync", {
      method: "PUT",
      headers: authorizedHeaders(),
      body: JSON.stringify({
        bookings: bookings.map(toSerializableServiceBooking),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync service bookings to API (${response.status})`);
    }

    return (await response.json()) as ServiceBooking[];
  },

  async createServiceBooking(booking: ServiceBooking) {
    const response = await fetchApi("/service-bookings/frontend", {
      method: "POST",
      headers: authorizedHeaders(),
      body: JSON.stringify(toSerializableServiceBooking(booking)),
    });

    if (!response.ok) {
      throw new Error(`Failed to create service booking in API (${response.status})`);
    }

    return (await response.json()) as ServiceBooking;
  },

  async updateServiceBooking(id: string, booking: ServiceBooking) {
    const response = await fetchApi(`/service-bookings/frontend/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authorizedHeaders(),
      body: JSON.stringify(toSerializableServiceBooking(booking)),
    });

    if (!response.ok) {
      throw new Error(`Failed to update service booking in API (${response.status})`);
    }

    return (await response.json()) as ServiceBooking;
  },

  async deleteServiceBooking(id: string) {
    const response = await fetchApi(`/service-bookings/frontend/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete service booking in API (${response.status})`);
    }

    return (await response.json()) as { deleted: boolean; id: string };
  },
};
