import { Component, ErrorInfo, ReactNode, Suspense, lazy, useEffect, useRef, useState } from "react";
import { Booking } from "@/app/components/calendar/types-v2";
import { ServiceBooking } from "@/app/components/calendar/service-types";
import { Toaster } from "@/app/components/ui/sonner";
import { MasterDataProvider } from "@/app/contexts/MasterDataContext";
import { Login } from "@/app/components/erp/Login";
import { RoleSelection } from "@/app/components/erp/RoleSelection";
import { bookingApi } from "@/app/lib/bookingApi";
import { serviceBookingApi } from "@/app/lib/serviceBookingApi";
import { authApi, AuthApiError } from "@/app/lib/authApi";
import { authStorage } from "@/app/lib/authStorage";
import { AuthSession, AuthUser } from "@/app/lib/authTypes";
import { hydrateMasterDataFromBackend } from "@/app/lib/masterDataStore";
import { hydrateWorkflowStateFromBackend } from "@/app/lib/workflowState";
import { APP_LOCALE } from "@/app/lib/locale";
import { toast } from "sonner";

// VenueOps ERP System - Version 2.0.14 - Multi-Service Calendar System - 21Feb2026

const LIVE_SYNC_POLL_INTERVAL_MS = 2000;

const isInvalidStoredSessionError = (error: unknown) =>
  error instanceof AuthApiError &&
  (error.status === 401 || error.status === 403 || error.message === "No active session");

console.log('🚀 VenueOps ERP v2.0.14 - Multi-Service Calendar System Loading...');

const isDemoBooking = (booking: any) => {
  const identifiers = [booking?.id, booking?.externalId, booking?.bookingNumber]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return identifiers.some((value) => value.startsWith("demo-"));
};

// Helper function to deserialize bookings and convert date strings to Date objects
const deserializeBookings = (bookings: any[]): Booking[] => {
  return bookings.filter((booking) => !isDemoBooking(booking)).map(booking => ({
    ...booking,
    date: typeof booking.date === 'string' ? new Date(booking.date) : booking.date,
    createdAt: typeof booking.createdAt === 'string' ? new Date(booking.createdAt) : booking.createdAt,
    inquiryDateTime:
      typeof booking.inquiryDateTime === 'string'
        ? new Date(booking.inquiryDateTime)
        : booking.inquiryDateTime,
    callbackDate: typeof booking.callbackDate === 'string' ? new Date(booking.callbackDate) : booking.callbackDate,
    approvalDate: typeof booking.approvalDate === 'string' ? new Date(booking.approvalDate) : booking.approvalDate,
    gracePeriodEndDate:
      typeof booking.gracePeriodEndDate === 'string'
        ? new Date(booking.gracePeriodEndDate)
        : booking.gracePeriodEndDate,
    confirmationRequestedAt:
      typeof booking.confirmationRequestedAt === 'string'
        ? new Date(booking.confirmationRequestedAt)
        : booking.confirmationRequestedAt,
    confirmationDeadline:
      typeof booking.confirmationDeadline === 'string'
        ? new Date(booking.confirmationDeadline)
        : booking.confirmationDeadline,
    releasedAt: typeof booking.releasedAt === 'string' ? new Date(booking.releasedAt) : booking.releasedAt,
  }));
};

// Helper function to deserialize service bookings
const deserializeServiceBookings = (bookings: any[]): ServiceBooking[] => {
  return bookings.map(booking => ({
    ...booking,
    date: typeof booking.date === 'string' ? new Date(booking.date) : booking.date,
    createdAt: typeof booking.createdAt === 'string' ? new Date(booking.createdAt) : booking.createdAt,
    rentalStartDate:
      typeof booking.rentalStartDate === 'string' ? new Date(booking.rentalStartDate) : booking.rentalStartDate,
    rentalEndDate:
      typeof booking.rentalEndDate === 'string' ? new Date(booking.rentalEndDate) : booking.rentalEndDate,
    deliveryDate:
      typeof booking.deliveryDate === 'string' ? new Date(booking.deliveryDate) : booking.deliveryDate,
    pickupDate:
      typeof booking.pickupDate === 'string' ? new Date(booking.pickupDate) : booking.pickupDate,
  }));
};

const toSerializableBooking = (booking: Booking) => ({
  ...booking,
  date: booking.date instanceof Date ? booking.date.toISOString() : booking.date,
  createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
  inquiryDateTime:
    booking.inquiryDateTime instanceof Date
      ? booking.inquiryDateTime.toISOString()
      : booking.inquiryDateTime,
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

const ACTIVE_ROLE_STORAGE_KEY = "venueops-active-role";
const ERPSystem = lazy(async () => ({
  default: (await import("@/app/components/erp/ERPSystem")).ERPSystem,
}));

const ROLE_SELECTION_TO_AUTH_ROLE: Record<string, AuthUser["role"]> = {
  admin: "ADMIN",
  "general-manager": "GENERAL_MANAGER",
  "front-office": "FRONT_OFFICE",
  accounts: "ACCOUNTS",
  "banquet-chef": "BANQUET_CHEF",
  "restaurant-chef": "RESTAURANT_CHEF",
  "hr-manager": "HR_MANAGER",
};

const loadStoredActiveRole = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedRole = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
  if (!storedRole) {
    return null;
  }

  if (ROLE_SELECTION_TO_AUTH_ROLE[storedRole]) {
    return storedRole;
  }

  window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
  return null;
};

const buildSafeDisplayName = (user?: Partial<AuthUser> | null) => {
  const fullName = user?.fullName?.trim();
  if (fullName) return fullName;

  const username = user?.username?.trim();
  if (username) return username;

  const email = user?.email?.trim();
  return email ? email.split("@")[0] || "User" : "User";
};

class AppRenderErrorBoundary extends Component<
  {
    children: ReactNode;
    resetKey: string;
    onBackToRoleSelection?: () => void;
    onLogout: () => void;
  },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ERP render failed after role selection:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Readonly<{ resetKey: string }>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-6">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">The ERP screen failed to load</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            The role was selected successfully, but the next screen hit a render error.
          </p>
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {this.state.error.message || "Unknown render error"}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {this.props.onBackToRoleSelection && (
              <button
                onClick={this.props.onBackToRoleSelection}
                className="rounded-md bg-[#1F3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2C5282]"
              >
                Back to Role Selection
              </button>
            )}
            <button
              onClick={this.props.onLogout}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#2E2E2E] hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function AppShellLoadingState({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-6">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-[#2E2E2E]">{label}</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Preparing the ERP workspace and loading only the modules needed for this session.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(() => loadStoredActiveRole());
  const [authReady, setAuthReady] = useState(false);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [bookingsReady, setBookingsReady] = useState(false);
  const [serviceBookingsReady, setServiceBookingsReady] = useState(false);
  const currentBookingsRef = useRef<Booking[]>([]);
  const currentServiceBookingsRef = useRef<ServiceBooking[]>([]);
  const syncedBookings = useRef<Booking[]>([]);
  const syncedServiceBookings = useRef<ServiceBooking[]>([]);
  const isSyncingBookings = useRef(false);
  const isSyncingServiceBookings = useRef(false);

  useEffect(() => {
    document.documentElement.lang = APP_LOCALE;
  }, []);

  useEffect(() => {
    currentBookingsRef.current = bookings;
  }, [bookings]);

  useEffect(() => {
    currentServiceBookingsRef.current = serviceBookings;
  }, [serviceBookings]);

  const serializeBookingsSignature = (items: Booking[]) =>
    JSON.stringify(
      items.map((booking) => ({
        ...booking,
        date: booking.date instanceof Date ? booking.date.toISOString() : booking.date,
        createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
        inquiryDateTime:
          booking.inquiryDateTime instanceof Date
            ? booking.inquiryDateTime.toISOString()
            : booking.inquiryDateTime,
      })),
    );

  const serializeBookingItem = (booking: Booking) =>
    JSON.stringify({
      ...booking,
      date: booking.date instanceof Date ? booking.date.toISOString() : booking.date,
      createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
      inquiryDateTime:
        booking.inquiryDateTime instanceof Date
          ? booking.inquiryDateTime.toISOString()
          : booking.inquiryDateTime,
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

  const serializeServiceBookingsSignature = (items: ServiceBooking[]) =>
    JSON.stringify(
      items.map((booking) => ({
        ...booking,
        date: booking.date instanceof Date ? booking.date.toISOString() : booking.date,
        createdAt: booking.createdAt instanceof Date ? booking.createdAt.toISOString() : booking.createdAt,
      })),
    );

  const serializeServiceBookingItem = (booking: ServiceBooking) =>
    JSON.stringify({
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

  useEffect(() => {
    let isMounted = true;
    const storedSession = authStorage.load();

    if (!storedSession) {
      setAuthReady(true);
      return () => {
        isMounted = false;
      };
    }

    setSession(storedSession);
    setAuthReady(true);

    void authApi.me()
      .then((user) => {
        if (!isMounted) {
          return;
        }

        setBackendNotice(null);
        setSession((currentSession) =>
          currentSession
            ? {
                ...currentSession,
                user,
              }
            : currentSession,
        );
      })
      .catch((error) => {
        console.warn("Failed to refresh stored auth session:", error);
        if (!isMounted) {
          return;
        }

        if (isInvalidStoredSessionError(error)) {
          authStorage.clear();
          window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
          setSession(null);
          setActiveRole(null);
          setBookings([]);
          setServiceBookings([]);
          syncedBookings.current = [];
          syncedServiceBookings.current = [];
          return;
        }

        toast.error("Backend temporarily unavailable", {
          description: "Your saved session was kept. Once the backend responds again, live data will reload.",
        });
        setBackendNotice("Reconnecting to backend. Your session is safe, and live data will resume automatically.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session || !authReady) {
      return;
    }

    void hydrateMasterDataFromBackend();
    void hydrateWorkflowStateFromBackend();
  }, [authReady, session]);

  // Load bookings from backend API on mount
  useEffect(() => {
    let isMounted = true;

    if (!session || !authReady) {
      setBookings([]);
      setServiceBookings([]);
      syncedBookings.current = [];
      syncedServiceBookings.current = [];
      setBookingsReady(false);
      setServiceBookingsReady(false);
      return () => {
        isMounted = false;
      };
    }

    const loadBookings = async () => {
      try {
        const apiBookings = deserializeBookings(await bookingApi.fetchBookings());

        if (!isMounted) return;

        setBackendNotice(null);
        setBookings(apiBookings);
        syncedBookings.current = apiBookings;
        setBookingsReady(true);
      } catch (error) {
        console.error("Failed to load bookings from API:", error);

        if (!isMounted) return;

        setBookings([]);
        syncedBookings.current = [];
        setBookingsReady(true);
        setBackendNotice("Backend connection unavailable. Reconnecting and waiting to reload reservations.");
        toast.error("Backend connection failed", {
          description: "No bookings were loaded. Start the backend to enter and save real bookings.",
        });
      }
    };

    const loadServiceBookings = async () => {
      try {
        const apiServiceBookings = deserializeServiceBookings(await serviceBookingApi.fetchServiceBookings());

        if (!isMounted) return;

        setBackendNotice(null);
        setServiceBookings(apiServiceBookings);
        syncedServiceBookings.current = apiServiceBookings;
        setServiceBookingsReady(true);
      } catch (error) {
        console.error("Failed to load service bookings from API:", error);

        if (!isMounted) return;

        setServiceBookings([]);
        syncedServiceBookings.current = [];
        setServiceBookingsReady(true);
        setBackendNotice("Backend connection unavailable. Reconnecting and waiting to reload live service bookings.");
        toast.error("Service bookings backend connection failed", {
          description: "Outdoor catering, food supply, and rental bookings could not be loaded from the backend.",
        });
      }
    };

    loadBookings();
    loadServiceBookings();
    
    return () => {
      isMounted = false;
    };
  }, [authReady, session]);

  useEffect(() => {
    if (!bookingsReady || isSyncingBookings.current) {
      return;
    }

    const previousBookings = syncedBookings.current;
    const previousSignature = serializeBookingsSignature(previousBookings);
    const currentSignature = serializeBookingsSignature(bookings);

    if (currentSignature === previousSignature) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        isSyncingBookings.current = true;
        const previousById = new Map(previousBookings.map((booking) => [booking.id, booking]));
        const currentById = new Map(bookings.map((booking) => [booking.id, booking]));
        const createdBookings = bookings.filter((booking) => !previousById.has(booking.id));
        const updatedBookings = bookings.filter((booking) => {
          const previousBooking = previousById.get(booking.id);
          return previousBooking ? serializeBookingItem(previousBooking) !== serializeBookingItem(booking) : false;
        });
        const deletedBookingIds = previousBookings
          .filter((booking) => !currentById.has(booking.id))
          .map((booking) => booking.id);

        await Promise.all([
          ...createdBookings.map((booking) => bookingApi.createBooking(booking)),
          ...updatedBookings.map((booking) => bookingApi.updateBooking(booking.id, booking)),
          ...deletedBookingIds.map((bookingId) => bookingApi.deleteBooking(bookingId)),
        ]);

        const apiBookings = deserializeBookings(await bookingApi.fetchBookings());
        syncedBookings.current = apiBookings;
        setBackendNotice(null);

        if (serializeBookingsSignature(currentBookingsRef.current) !== serializeBookingsSignature(apiBookings)) {
          setBookings(apiBookings);
        }
      } catch (error) {
        console.error("Failed to sync bookings to API:", error);
        toast.error("Booking sync failed", {
          description:
            error instanceof Error
              ? error.message
              : "Your latest booking changes could not be saved to the backend.",
        });
      } finally {
        isSyncingBookings.current = false;
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [bookings, bookingsReady]);

  useEffect(() => {
    if (!serviceBookingsReady || isSyncingServiceBookings.current) {
      return;
    }

    const previousBookings = syncedServiceBookings.current;
    const previousSignature = serializeServiceBookingsSignature(previousBookings);
    const currentSignature = serializeServiceBookingsSignature(serviceBookings);

    if (currentSignature === previousSignature) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        isSyncingServiceBookings.current = true;
        const previousById = new Map(previousBookings.map((booking) => [booking.id, booking]));
        const currentById = new Map(serviceBookings.map((booking) => [booking.id, booking]));
        const createdBookings = serviceBookings.filter((booking) => !previousById.has(booking.id));
        const updatedBookings = serviceBookings.filter((booking) => {
          const previousBooking = previousById.get(booking.id);
          return previousBooking
            ? serializeServiceBookingItem(previousBooking) !== serializeServiceBookingItem(booking)
            : false;
        });
        const deletedBookingIds = previousBookings
          .filter((booking) => !currentById.has(booking.id))
          .map((booking) => booking.id);

        await Promise.all([
          ...createdBookings.map((booking) => serviceBookingApi.createServiceBooking(booking)),
          ...updatedBookings.map((booking) => serviceBookingApi.updateServiceBooking(booking.id, booking)),
          ...deletedBookingIds.map((bookingId) => serviceBookingApi.deleteServiceBooking(bookingId)),
        ]);

        const apiServiceBookings = deserializeServiceBookings(await serviceBookingApi.fetchServiceBookings());
        syncedServiceBookings.current = apiServiceBookings;
        setBackendNotice(null);

        if (
          serializeServiceBookingsSignature(currentServiceBookingsRef.current) !==
          serializeServiceBookingsSignature(apiServiceBookings)
        ) {
          setServiceBookings(apiServiceBookings);
        }
      } catch (error) {
        console.error("Failed to sync service bookings to API:", error);
        toast.error("Service booking sync failed", {
          description: "Your latest service booking changes could not be saved to the backend.",
        });
      } finally {
        isSyncingServiceBookings.current = false;
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [serviceBookings, serviceBookingsReady]);

  const handleUpdateBookings = (updatedBookings: Booking[]) => {
    setBookings(updatedBookings);
  };

  const handleUpdateServiceBookings = (updatedBookings: ServiceBooking[]) => {
    setServiceBookings(updatedBookings);
  };

  useEffect(() => {
    if (!session || !authReady) {
      return;
    }

    let isCancelled = false;

    const refreshSharedState = async () => {
      try {
        await hydrateMasterDataFromBackend();
        await hydrateWorkflowStateFromBackend();
        setBackendNotice(null);
      } catch (error) {
        console.error("Background shared-state refresh failed:", error);
        setBackendNotice("Reconnecting to backend. Local screen is open, but shared updates are temporarily delayed.");
      }

      const bookingsDirty =
        serializeBookingsSignature(currentBookingsRef.current) !==
        serializeBookingsSignature(syncedBookings.current);

      if (!bookingsDirty && !isSyncingBookings.current) {
        try {
          const apiBookings = deserializeBookings(await bookingApi.fetchBookings());
          if (!isCancelled) {
            const apiSignature = serializeBookingsSignature(apiBookings);
            const localSignature = serializeBookingsSignature(currentBookingsRef.current);
            setBackendNotice(null);
            if (apiSignature !== localSignature) {
              syncedBookings.current = apiBookings;
              setBookings(apiBookings);
            }
          }
        } catch (error) {
          console.error("Background booking refresh failed:", error);
          setBackendNotice("Reconnecting to backend. Reservation updates from other users are temporarily delayed.");
        }
      }

      const serviceBookingsDirty =
        serializeServiceBookingsSignature(currentServiceBookingsRef.current) !==
        serializeServiceBookingsSignature(syncedServiceBookings.current);

      if (!serviceBookingsDirty && !isSyncingServiceBookings.current) {
        try {
          const apiServiceBookings = deserializeServiceBookings(await serviceBookingApi.fetchServiceBookings());
          if (!isCancelled) {
            const apiSignature = serializeServiceBookingsSignature(apiServiceBookings);
            const localSignature = serializeServiceBookingsSignature(currentServiceBookingsRef.current);
            setBackendNotice(null);
            if (apiSignature !== localSignature) {
              syncedServiceBookings.current = apiServiceBookings;
              setServiceBookings(apiServiceBookings);
            }
          }
        } catch (error) {
          console.error("Background service booking refresh failed:", error);
          setBackendNotice("Reconnecting to backend. Live service booking updates are temporarily delayed.");
        }
      }
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        void refreshSharedState();
      }
    };

    const handleWindowFocus = () => {
      void refreshSharedState();
    };

    const intervalId = window.setInterval(() => {
      void refreshSharedState();
    }, LIVE_SYNC_POLL_INTERVAL_MS);

    window.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [authReady, session]);

  const handleLogin = async (username: string, password: string) => {
    setActiveRole(null);
    window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    const newSession = await authApi.login(username, password);
    setSession(newSession);
    setAuthReady(true);
  };

  const handleRoleSelect = (role: string, rememberRole: boolean) => {
    if (!ROLE_SELECTION_TO_AUTH_ROLE[role]) {
      window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
      setActiveRole(null);
      return;
    }

    setActiveRole(role);
    if (rememberRole) {
      window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
    } else {
      window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    }
  };

  const handleLogout = () => {
    authStorage.clear();
    window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    setSession(null);
    setActiveRole(null);
    setBookings([]);
    setServiceBookings([]);
    syncedBookings.current = [];
    syncedServiceBookings.current = [];
  };

  const handleBackToRoleSelection = () => {
    window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    setActiveRole(null);
  };

  const selectedAuthRole = activeRole ? ROLE_SELECTION_TO_AUTH_ROLE[activeRole] : null;
  const effectiveUser = session?.user
    ? {
        ...session.user,
        fullName: buildSafeDisplayName(session.user),
        role:
          session.user.role === "ADMIN" && selectedAuthRole
            ? selectedAuthRole
            : session.user.role,
        permissions:
          session.user.role === "ADMIN" && selectedAuthRole
            ? []
            : session.user.permissions ?? [],
      }
    : null;

  const shouldShowRoleSelection = authReady && !!session && session.user.role === "ADMIN" && !activeRole;

  return (
    <MasterDataProvider>
      <div className="min-h-screen bg-gray-50">
        {backendNotice ? (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
              <span className="font-medium">{backendNotice}</span>
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Reconnecting
              </span>
            </div>
          </div>
        ) : null}
        {authReady && !session ? (
          <>
            <Login onLogin={handleLogin} />
            <Toaster />
          </>
        ) : !authReady ? (
          <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
            Restoring secure session...
          </div>
        ) : shouldShowRoleSelection ? (
          <>
            <RoleSelection onSelectRole={handleRoleSelect} userEmail={buildSafeDisplayName(session.user)} />
            <Toaster />
          </>
        ) : (
          <>
        {/* Main ERP System */}
        <AppRenderErrorBoundary
          resetKey={`${session?.user?.id ?? "anon"}:${activeRole ?? "no-role"}:${effectiveUser?.role ?? "no-effective-role"}`}
          onBackToRoleSelection={session?.user?.role === "ADMIN" ? handleBackToRoleSelection : undefined}
          onLogout={handleLogout}
        >
          <Suspense fallback={<AppShellLoadingState label="Opening ERP workspace..." />}>
            <ERPSystem 
              currentUser={effectiveUser!}
              onLogout={handleLogout}
              bookings={bookings} 
              onBookingsChange={handleUpdateBookings}
              serviceBookings={serviceBookings}
              onServiceBookingsChange={handleUpdateServiceBookings}
            />
          </Suspense>
        </AppRenderErrorBoundary>

        {/* Toast Notifications */}
        <Toaster />
          </>
        )}
      </div>
    </MasterDataProvider>
  );
}
