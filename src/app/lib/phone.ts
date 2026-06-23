const LOCAL_PAKISTANI_MOBILE_PATTERN = /^03\d{9}$/;
const INTERNATIONAL_PAKISTANI_MOBILE_PATTERN = /^\+92\d{10}$/;

export const PAKISTANI_MOBILE_VALIDATION_MESSAGE =
  'Enter valid mobile number, e.g. 03XXXXXXXXX or +92XXXXXXXXXX';

export const phoneDigits = (value?: string) => (value || '').replace(/\D/g, '');

export const isValidPakistaniMobileInput = (value?: string) => {
  const trimmed = (value || '').trim();
  return (
    LOCAL_PAKISTANI_MOBILE_PATTERN.test(trimmed) ||
    INTERNATIONAL_PAKISTANI_MOBILE_PATTERN.test(trimmed)
  );
};

export const normalizePakistaniMobile = (value?: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  if (LOCAL_PAKISTANI_MOBILE_PATTERN.test(trimmed)) {
    return `92${trimmed.slice(1)}`;
  }

  if (INTERNATIONAL_PAKISTANI_MOBILE_PATTERN.test(trimmed)) {
    return trimmed.slice(1);
  }

  const digits = phoneDigits(trimmed);

  if (digits.length === 11 && digits.startsWith('03')) {
    return `92${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith('923')) {
    return digits;
  }

  return '';
};

export const phoneLookupKey = (value?: string) => {
  const normalized = normalizePakistaniMobile(value);
  return normalized || phoneDigits(value);
};

export const normalizeWhatsAppNumber = (value?: string) => normalizePakistaniMobile(value);
