import { Pandal, RouteStop, NightPlan } from '../types';
import { PANDALS_DATA } from '../data/pandals';

const ITINERARY_KEY = 'kolkata_puja_itinerary_v1';
const FAVORITES_KEY = 'kolkata_puja_favorites_v1';
const CUSTOM_PANDALS_KEY = 'kolkata_puja_custom_pandals_v1';
const NIGHT_PLAN_KEY = 'kolkata_puja_night_plan_v1';

export function loadSavedNightPlan(): NightPlan | null {
  try {
    const raw = localStorage.getItem(NIGHT_PLAN_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load night plan from storage:', e);
  }
  return null;
}

export function saveNightPlan(plan: NightPlan): void {
  try {
    localStorage.setItem(NIGHT_PLAN_KEY, JSON.stringify(plan));
  } catch (e) {
    console.error('Failed to save night plan to storage:', e);
  }
}

export function clearSavedNightPlan(): void {
  try {
    localStorage.removeItem(NIGHT_PLAN_KEY);
  } catch (e) {
    console.error('Failed to clear night plan from storage:', e);
  }
}

export function loadSavedItinerary(): RouteStop[] {
  try {
    const raw = localStorage.getItem(ITINERARY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load itinerary from storage:', e);
  }
  return [];
}

export function saveItinerary(stops: RouteStop[]): void {
  try {
    localStorage.setItem(ITINERARY_KEY, JSON.stringify(stops));
  } catch (e) {
    console.error('Failed to save itinerary to storage:', e);
  }
}

export function loadSavedFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load favorites:', e);
  }
  return [];
}

export function saveFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
}

export function loadAllPandals(): Pandal[] {
  try {
    const custom = localStorage.getItem(CUSTOM_PANDALS_KEY);
    if (custom) {
      const parsed: Pandal[] = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom pandals:', e);
  }
  return PANDALS_DATA;
}

export function saveCustomPandals(pandals: Pandal[]): void {
  try {
    localStorage.setItem(CUSTOM_PANDALS_KEY, JSON.stringify(pandals));
  } catch (e) {
    console.error('Failed to save custom pandals:', e);
  }
}

export function resetPandalsToDefault(): Pandal[] {
  try {
    localStorage.removeItem(CUSTOM_PANDALS_KEY);
  } catch (e) {
    console.error('Failed to reset pandals:', e);
  }
  return PANDALS_DATA;
}

