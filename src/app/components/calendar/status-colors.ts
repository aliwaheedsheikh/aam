import { BookingStatus } from './types';

export const statusColors = {
  available: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Available',
  },
  tentative: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Tentative',
  },
  confirmed: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Confirmed',
  },
  draft: {
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
    label: 'Draft',
  },
  price_quoted: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Price Quoted',
  },
  completed: {
    bg: 'bg-green-50',
    border: 'border-green-600',
    text: 'text-green-800',
    dot: 'bg-green-600',
    label: 'Completed',
  },
  cancelled: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-600',
    dot: 'bg-red-400',
    label: 'Cancelled',
  },
  expired: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'Expired',
  },
};

export const getStatusColor = (status: BookingStatus | string) => {
  // Return the status color if it exists, otherwise return a default
  return statusColors[status as keyof typeof statusColors] || {
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
    label: status,
  };
};