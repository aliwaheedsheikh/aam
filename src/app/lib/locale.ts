const PK_LOCALE = "en-PK";

type DateLike = Date | string | number | null | undefined;
type TimeLike = string | Date | null | undefined;

function toValidDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimeParts(value: TimeLike): { hours: number; minutes: number } | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return {
      hours: value.getHours(),
      minutes: value.getMinutes(),
    };
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  } else if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  }

  return { hours, minutes };
}

export function formatNumberPK(value: number, options?: Intl.NumberFormatOptions): string {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(PK_LOCALE, options).format(amount);
}

export function formatCurrencyPKR(amount: number | string | null | undefined, options?: { compact?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount ?? 0;
  const safeAmount = Number.isFinite(numericAmount) ? Number(numericAmount) : 0;

  if (options?.compact) {
    return `Rs. ${formatNumberPK(safeAmount, {
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 1,
    })}`;
  }

  return `Rs. ${formatNumberPK(safeAmount, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  })}`;
}

export function formatDatePK(value: DateLike): string {
  const date = toValidDate(value);
  if (!date) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return `${day}-${month}-${year}`;
}

export function formatTimePK(value: TimeLike): string {
  const parts = toTimeParts(value);
  if (!parts) {
    return "";
  }

  const date = new Date();
  date.setHours(parts.hours, parts.minutes, 0, 0);

  return new Intl.DateTimeFormat(PK_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateTimePK(value: DateLike): string {
  const date = toValidDate(value);
  if (!date) {
    return "";
  }

  return `${formatDatePK(date)} ${formatTimePK(date)}`;
}

export function formatTimeRangePK(startTime: TimeLike, endTime: TimeLike): string {
  const start = formatTimePK(startTime);
  const end = formatTimePK(endTime);

  if (!start && !end) {
    return "";
  }

  if (!start) {
    return end;
  }

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
}

export const APP_LOCALE = PK_LOCALE;
