/**
 * Centralized Category, Style, and Visual Identity Metadata for PujoPath
 * Conforms to Kolkata Puja cultural palette with color-vision deficiency accessibility.
 */

export interface CategoryMeta {
  id: string;
  name: string;
  bengaliName: string;
  color: string;
  bgSoft: string;
  border: string;
  icon: string;
  symbolText: string;
  description: string;
}

export const CATEGORY_STYLES: Record<string, CategoryMeta> = {
  Traditional: {
    id: 'Traditional',
    name: 'Traditional Puja',
    bengaliName: 'ঐতিহ্যবাহী সাবেকী পূজা',
    color: '#D97706', // Warm saffron / amber
    bgSoft: '#FFFBEB',
    border: '#FDE68A',
    icon: '🪔',
    symbolText: 'Sabeki Ekchala',
    description: 'Heritage idols in classical Daker Saaj, earthen pratimashilpa, and timeless Bengali rituals.',
  },
  Theme: {
    id: 'Theme',
    name: 'Artistic / Theme Puja',
    bengaliName: 'শিল্পভাবনা ও থিম পূজা',
    color: '#7C3AED', // Violet / indigo
    bgSoft: '#F5F3FF',
    border: '#DDD6FE',
    icon: '🎨',
    symbolText: 'Artistic Theme',
    description: 'Conceptual installations, rural handicraft, puppetry, and experimental aesthetics.',
  },
  'Heritage Rajbari': {
    id: 'Heritage Rajbari',
    name: 'Heritage Rajbari / Bonedi Bari',
    bengaliName: 'বনেদি রাজবাড়ি পূজা',
    color: '#B45309', // Antique gold / bronze
    bgSoft: '#FEF3C7',
    border: '#FCD34D',
    icon: '🏛',
    symbolText: 'Bonedi Bari',
    description: 'Centuries-old aristocratic household pujas celebrated in historic zamindari courtyards.',
  },
  'Contemporary Landmark': {
    id: 'Contemporary Landmark',
    name: 'Famous / Landmark Puja',
    bengaliName: 'বিখ্যাত মহোৎসব ও ল্যান্ডমার্ক',
    color: '#C92A2A', // Deep crimson / bright magenta
    bgSoft: '#FEF2F2',
    border: '#FECACA',
    icon: '⭐',
    symbolText: 'Grand Landmark',
    description: 'Monumental architectural replicas, high-footfall mega celebrations, and grand lighting.',
  },
};

export const DEFAULT_CATEGORY_STYLE: CategoryMeta = {
  id: 'Other',
  name: 'Community Puja',
  bengaliName: 'সার্বজনীন পূজা',
  color: '#4B5563', // Neutral slate
  bgSoft: '#F3F4F6',
  border: '#E5E7EB',
  icon: '✦',
  symbolText: 'Sarbojanin',
  description: 'Neighborhood community celebration with devotional traditions.',
};

/**
 * Editorial artistic styles extracted from actual dataset themes & descriptions
 */
export interface ArtisticStyleMeta {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export const ARTISTIC_STYLES: ArtisticStyleMeta[] = [
  {
    id: 'sabeki',
    label: 'Ekchala & Sabeki',
    icon: '🪔',
    keywords: ['ekchala', 'sabeki', 'daker saaj', 'traditional', 'centenary', 'heritage idol'],
  },
  {
    id: 'illumination',
    label: 'Chandannagar Lights',
    icon: '✨',
    keywords: ['chandannagar', 'illumination', 'light', 'chandelier', 'water reflection'],
  },
  {
    id: 'craft',
    label: 'Folk & Rural Craft',
    icon: '🧶',
    keywords: ['craft', 'puppetry', 'handloom', 'terracotta', 'bamboo', 'folk', 'rural', 'artisan'],
  },
  {
    id: 'architecture',
    label: 'Architectural Replicas',
    icon: '🏰',
    keywords: ['architectural', 'replica', 'temple', 'palace', 'monument', 'ayodhya'],
  },
  {
    id: 'contemporary',
    label: 'Contemporary Installation',
    icon: '🎨',
    keywords: ['contemporary', 'installation', 'experimental', 'sculpture', 'abstract', 'eco-friendly'],
  },
];

/**
 * Featured / Famous pandal metadata styling
 */
export const FEATURED_MARKER_STYLE = {
  label: 'Famous & Featured',
  badge: '⭐ Featured',
  color: '#C92A2A',
  haloColor: '#FFFFFF',
  starSymbol: '★',
};

/**
 * Helper to retrieve category metadata deterministically
 */
export function getCategoryMeta(category?: string | null, isHighlighted?: boolean): CategoryMeta {
  if (category && CATEGORY_STYLES[category]) {
    return CATEGORY_STYLES[category];
  }
  if (isHighlighted) {
    return CATEGORY_STYLES['Contemporary Landmark'];
  }
  return DEFAULT_CATEGORY_STYLE;
}
