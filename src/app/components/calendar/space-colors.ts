// Color mapping for Prime Spaces and their Sub Spaces
// Each prime space has a unique color, and sub-spaces use a lighter version

export interface SpaceColorScheme {
  prime: {
    bg: string;
    border: string;
    text: string;
  };
  sub: {
    bg: string;
    border: string;
    text: string;
  };
  accent: {
    bg: string;
    border: string;
  };
}

// Color schemes for each prime space
const colorSchemes: Record<string, SpaceColorScheme> = {
  // Aiwan-e-Akbari - Marquees (Blue tones)
  'aiwan-marquee-1': {
    prime: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900' },
    sub: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800' },
    accent: { bg: 'bg-blue-500', border: 'border-blue-600' },
  },
  'aiwan-marquee-2': {
    prime: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-900' },
    sub: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-800' },
    accent: { bg: 'bg-indigo-500', border: 'border-indigo-600' },
  },
  'aiwan-marquee-3': {
    prime: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-900' },
    sub: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800' },
    accent: { bg: 'bg-purple-500', border: 'border-purple-600' },
  },

  // Aiwan-e-Akbari - Lawns (Green tones)
  'aiwan-lawn-1': {
    prime: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-900' },
    sub: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
    accent: { bg: 'bg-emerald-500', border: 'border-emerald-600' },
  },
  'aiwan-lawn-2': {
    prime: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-900' },
    sub: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800' },
    accent: { bg: 'bg-teal-500', border: 'border-teal-600' },
  },
  'aiwan-lawn-3': {
    prime: { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-900' },
    sub: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-800' },
    accent: { bg: 'bg-cyan-500', border: 'border-cyan-600' },
  },

  // Taj Mahal Banquet Hall - Halls (Orange/Amber tones)
  'taj-hall-1': {
    prime: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900' },
    sub: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
    accent: { bg: 'bg-amber-500', border: 'border-amber-600' },
  },
  'taj-hall-2': {
    prime: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900' },
    sub: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800' },
    accent: { bg: 'bg-orange-500', border: 'border-orange-600' },
  },
};

// Default color scheme for unknown spaces
const defaultColorScheme: SpaceColorScheme = {
  prime: { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-900' },
  sub: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800' },
  accent: { bg: 'bg-gray-500', border: 'border-gray-600' },
};

export function getPrimeSpaceColors(primeSpaceId: string): SpaceColorScheme {
  return colorSchemes[primeSpaceId] || defaultColorScheme;
}

export function getSubSpaceColors(primeSpaceId: string): SpaceColorScheme {
  return colorSchemes[primeSpaceId] || defaultColorScheme;
}

// Helper to get accent color for booking blocks
export function getSpaceAccentColor(primeSpaceId: string): string {
  const scheme = colorSchemes[primeSpaceId] || defaultColorScheme;
  return scheme.accent.bg;
}

// Helper to get accent border for booking blocks
export function getSpaceAccentBorder(primeSpaceId: string): string {
  const scheme = colorSchemes[primeSpaceId] || defaultColorScheme;
  return scheme.accent.border;
}
