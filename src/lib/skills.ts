import { SKILL_SEED } from "./taxonomy";

const ROLE_CATEGORY: Record<string, string[]> = {
  Barista: ["Barista", "General"],
  Bartender: ["Bartender", "General"],
  "Waiter / Waitress": ["Service", "General"],
  "Host / Hostess": ["Service", "General"],
  Cashier: ["Service", "General"],
  Chef: ["Kitchen", "General"],
  "Sous Chef": ["Kitchen", "General"],
  Cook: ["Kitchen", "General"],
  "Kitchen Helper": ["Kitchen", "General"],
  Dishwasher: ["Kitchen", "General"],
  Receptionist: ["Front Office", "General"],
  Housekeeping: ["Housekeeping", "General"],
  "Spa Therapist": ["Spa", "General"],
};

/** Suggested skill names for a set of roles (for chips in forms). */
export function suggestedSkillsForRoles(roles: string[]): string[] {
  const cats = new Set<string>(["General"]);
  roles.forEach((r) => (ROLE_CATEGORY[r] ?? ["General"]).forEach((c) => cats.add(c)));
  return SKILL_SEED.filter((s) => cats.has(s.category)).map((s) => s.name);
}
