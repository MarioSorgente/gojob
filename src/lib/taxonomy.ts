/**
 * GoJob reference taxonomy.
 *
 * Predefined lists live here as TypeScript constants (not Firestore) so the UI
 * and matching engine share one source of truth. All role/language/skill fields
 * support `"Other"` free text, so these are *suggestions*, not a closed set.
 *
 * The skills taxonomy (SKILL_SEED) is additionally seeded into the Firestore
 * `skills` collection by scripts/seed.ts.
 */

export const ROLES = [
  "Barista",
  "Waiter / Waitress",
  "Bartender",
  "Host / Hostess",
  "Cashier",
  "Chef",
  "Sous Chef",
  "Cook",
  "Kitchen Helper",
  "Dishwasher",
  "Restaurant Manager",
  "Supervisor",
  "Housekeeping",
  "Receptionist",
  "Security",
  "Spa Therapist",
  "Other",
] as const;

/** Bali areas the marketplace covers. Manual selection — no GPS. */
export const AREAS = [
  "Canggu",
  "Berawa",
  "Seminyak",
  "Kuta",
  "Legian",
  "Kerobokan",
  "Umalas",
  "Denpasar",
  "Sanur",
  "Ubud",
  "Jimbaran",
  "Nusa Dua",
  "Ungasan",
] as const;

/**
 * Clusters of areas that are close enough to commute between. Used by the
 * matching engine to give partial location credit for a nearby (not exact) area.
 */
export const AREA_CLUSTERS: readonly (readonly string[])[] = [
  ["Canggu", "Berawa", "Kerobokan", "Umalas"],
  ["Seminyak", "Kuta", "Legian", "Kerobokan"],
  ["Jimbaran", "Nusa Dua", "Ungasan"],
  ["Denpasar", "Sanur"],
];

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Daily Worker",
  "Temporary",
  "Internship",
  "Freelance",
] as const;

export const SALARY_TYPES = ["Monthly", "Daily", "Hourly"] as const;

export const AVAILABILITY_TYPES = [
  "Available immediately",
  "Available within 7 days",
  "Available within 14 days",
  "Available within 30 days",
  "Custom date",
] as const;

export const LANGUAGES = [
  "Indonesian",
  "English",
  "Balinese",
  "Russian",
  "Mandarin",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Dutch",
  "Arabic",
  "Other",
] as const;

/** Proficiency levels, ordered weakest -> strongest (index doubles as rank). */
export const PROFICIENCY_LEVELS = [
  "Basic",
  "Conversational",
  "Fluent",
  "Native",
] as const;

export const BUSINESS_CATEGORIES = [
  "Café",
  "Restaurant",
  "Hotel",
  "Bar",
  "Beach Club",
  "Nightclub",
  "Bakery",
  "Coffee Shop",
  "Resort",
  "Villa",
  "Spa",
  "Warung",
  "Other",
] as const;

/** Seed skills, grouped by the role they most associate with. */
export const SKILL_SEED: readonly { name: string; category: string }[] = [
  // Barista
  { name: "Espresso machine", category: "Barista" },
  { name: "Latte art", category: "Barista" },
  { name: "Coffee calibration", category: "Barista" },
  { name: "Manual brewing", category: "Barista" },
  { name: "Grinder dialing", category: "Barista" },
  // Bartender
  { name: "Cocktail preparation", category: "Bartender" },
  { name: "Mixology", category: "Bartender" },
  { name: "Wine knowledge", category: "Bartender" },
  { name: "Flair bartending", category: "Bartender" },
  // Waiter / service
  { name: "POS", category: "Service" },
  { name: "Table service", category: "Service" },
  { name: "Upselling", category: "Service" },
  { name: "Order taking", category: "Service" },
  { name: "Wine service", category: "Service" },
  // Kitchen
  { name: "Food preparation", category: "Kitchen" },
  { name: "Grill", category: "Kitchen" },
  { name: "Plating", category: "Kitchen" },
  { name: "Food safety / hygiene", category: "Kitchen" },
  { name: "Menu development", category: "Kitchen" },
  // Front desk / hotel
  { name: "Guest check-in", category: "Front Office" },
  { name: "Reservations", category: "Front Office" },
  { name: "Booking systems", category: "Front Office" },
  // Housekeeping / spa
  { name: "Room cleaning", category: "Housekeeping" },
  { name: "Laundry", category: "Housekeeping" },
  { name: "Massage therapy", category: "Spa" },
  { name: "Body treatments", category: "Spa" },
  // General
  { name: "Cash handling", category: "General" },
  { name: "Customer service", category: "General" },
  { name: "Team leadership", category: "General" },
  { name: "Inventory management", category: "General" },
];

export type Role = (typeof ROLES)[number] | (string & {});
export type Area = (typeof AREAS)[number] | (string & {});
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type SalaryType = (typeof SALARY_TYPES)[number];
export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number];
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number] | (string & {});

/** Rank of a proficiency level (Basic=0 … Native=3); -1 if unknown. */
export function proficiencyRank(level: string | undefined | null): number {
  if (!level) return -1;
  return PROFICIENCY_LEVELS.indexOf(level as ProficiencyLevel);
}

/** True when `a` and `b` are the same area or fall in a shared commute cluster. */
export function areasAreNearby(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return AREA_CLUSTERS.some(
    (cluster) => cluster.includes(a) && cluster.includes(b),
  );
}
