/**
 * Demo marketplace fixture data (scope §31).
 *
 * Pure data + builders, deliberately free of any Firebase import so that both
 * callers can use it: the CLI (`scripts/seed.ts`, running under tsx) and the
 * web endpoint (`/api/admin/seed-demo`, running in a Next server route). The
 * writing itself lives in ./seed.ts, which takes its Firestore/Auth handles
 * from the caller.
 *
 * Every id here is prefixed `seed-` so the reset action can find and remove
 * exactly what seeding created, leaving accounts you registered yourself alone.
 */

import { computeProfileStrength } from "../profileStrength";
import { totalExperienceYears } from "../dates";
import type {
  Business,
  CandidateLanguage,
  CandidateProfile,
  CandidateSummary,
  Experience,
  Job,
  SkillRef,
  VerificationStatus,
} from "../types";

/** Password for every seeded demo login. */
export const DEMO_PASSWORD = "demo1234";

/** Prefix marking a document as seed-created (used by reset). */
export const SEED_PREFIX = "seed-";

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@gojob.demo", displayName: "GoJob Admin" },
  employer: { email: "owner@milkandmadu.demo", displayName: "Milk & Madu Owner" },
  candidate: { email: "ayu@gojob.demo", displayName: "Ayu Pratiwi" },
} as const;

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function toSummary(c: CandidateProfile): CandidateSummary {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    photo: c.photo,
    area: c.area,
    primaryRole: c.roles[0] ?? "Other",
    yearsExperience: totalExperienceYears(c.experiences),
    salary: c.salary,
    availability: c.availability,
    languages: c.languages,
    verification: c.verification,
  };
}

export interface CandidateSeed {
  uid: string;
  firstName: string;
  lastName: string;
  area: string;
  roles: string[];
  salaryMin: number;
  salaryMax: number;
  availability: string;
  languages: CandidateLanguage[];
  skills: string[];
  experiences: {
    companyName: string;
    role: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
  }[];
  phone: VerificationStatus;
  id: VerificationStatus;
  /** Set when `id` is "pending" so the admin queue has something to review. */
  idDocumentPath?: string;
  /** Drives the workplace-verification queue; applied to the first experience. */
  employment?: VerificationStatus;
}

export function buildCandidate(seed: CandidateSeed): CandidateProfile {
  const experiences: Experience[] = seed.experiences.map((e, i) => ({
    id: `${seed.uid}-exp-${i}`,
    companyName: e.companyName,
    role: e.role,
    startDate: e.startDate,
    endDate: e.current ? null : e.endDate,
    current: e.current,
    description: "",
    verificationStatus:
      i === 0 ? (seed.employment ?? "not_submitted") : "not_submitted",
  }));
  const skills: SkillRef[] = seed.skills.map((name) => ({ name }));

  const profile: CandidateProfile = {
    userId: seed.uid,
    firstName: seed.firstName,
    lastName: seed.lastName,
    photo: null,
    nationality: "Indonesian",
    workEligibility: true,
    area: seed.area,
    roles: seed.roles,
    employmentTypes: ["Full-time"],
    salary: { type: "Monthly", min: seed.salaryMin, max: seed.salaryMax },
    availability: {
      type: seed.availability,
      availableFrom: null,
    } as CandidateProfile["availability"],
    languages: seed.languages,
    skills,
    experiences,
    profileStrength: 0,
    verification: {
      phone: seed.phone,
      id: seed.id,
      employment: seed.employment ?? "not_submitted",
    },
    idDocumentPath: seed.idDocumentPath ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  profile.profileStrength = computeProfileStrength(profile).percent;
  return profile;
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export const MILK_MADU_ID = `${SEED_PREFIX}milk-madu`;
export const REVOLVER_ID = `${SEED_PREFIX}revolver`;
export const WARUNG_ID = `${SEED_PREFIX}sunset-warung`;

/** Owner uid for venues that intentionally have no login of their own. */
export const REVOLVER_OWNER = `${SEED_PREFIX}revolver-owner`;
export const WARUNG_OWNER = `${SEED_PREFIX}warung-owner`;

export const MILK_MADU: Omit<Business, "id" | "ownerId" | "createdAt"> = {
  name: "Milk & Madu",
  category: "Café",
  area: "Canggu",
  address: "Jl. Pantai Berawa No.52, Canggu",
  instagram: "@milkandmadu",
  website: "https://milkandmadu.com",
  googleMapsUrl: "https://maps.app.goo.gl/milkandmadu",
  logo: null,
  description: "Family-friendly all-day café in Canggu.",
  verificationStatus: "verified",
};

export const REVOLVER: Omit<Business, "id" | "ownerId" | "createdAt"> = {
  name: "Revolver Café",
  category: "Coffee Shop",
  area: "Seminyak",
  address: "Jl. Kayu Aya, Seminyak",
  instagram: "@revolverespresso",
  website: "https://revolverespresso.com",
  googleMapsUrl: "https://maps.app.goo.gl/revolver",
  logo: null,
  description: "Specialty coffee institution in Seminyak.",
  verificationStatus: "verified",
};

/** Left pending on purpose so /admin/verifications has a business to review. */
export const SUNSET_WARUNG: Omit<Business, "id" | "ownerId" | "createdAt"> = {
  name: "Sunset Warung",
  category: "Warung",
  area: "Ungasan",
  address: "Jl. Labuansait, Pecatu",
  instagram: "@sunsetwarung",
  website: null,
  googleMapsUrl: null,
  logo: null,
  description: "Small family warung near the cliffs.",
  verificationStatus: "pending",
};

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobSeed = Omit<
  Job,
  "id" | "createdAt" | "businessId" | "ownerId" | "businessName" | "businessVerified"
>;

/** Jobs posted by the demo employer, so their own dashboard has content. */
export const MILK_MADU_JOBS: { id: string; job: JobSeed }[] = [
  {
    id: `${SEED_PREFIX}job-barista`,
    job: {
      role: "Barista",
      area: "Canggu",
      employmentType: "Full-time",
      salaryType: "Monthly",
      salaryMin: 6_000_000,
      salaryMax: 8_000_000,
      minimumExperience: 1,
      skills: [
        { name: "Espresso machine", required: true },
        { name: "Latte art", required: true },
        { name: "Manual brewing", required: false },
      ],
      languages: [{ language: "English", minimumLevel: "Conversational" }],
      desiredStartDate: null,
      description:
        "Morning shift barista for our Berawa flagship. Busy espresso bar, great team.",
      status: "live",
    },
  },
  {
    id: `${SEED_PREFIX}job-waiter`,
    job: {
      role: "Waiter / Waitress",
      area: "Canggu",
      employmentType: "Full-time",
      salaryType: "Monthly",
      salaryMin: 4_500_000,
      salaryMax: 6_000_000,
      minimumExperience: 1,
      skills: [
        { name: "Table service", required: true },
        { name: "POS", required: true },
        { name: "Upselling", required: false },
      ],
      languages: [{ language: "English", minimumLevel: "Conversational" }],
      desiredStartDate: null,
      description: "All-day floor service. Friendly, fast-paced café environment.",
      status: "live",
    },
  },
  {
    id: `${SEED_PREFIX}job-chef`,
    job: {
      role: "Chef",
      area: "Canggu",
      employmentType: "Full-time",
      salaryType: "Monthly",
      salaryMin: 9_000_000,
      salaryMax: 13_000_000,
      minimumExperience: 3,
      skills: [
        { name: "Menu development", required: true },
        { name: "Food safety / hygiene", required: true },
        { name: "Plating", required: false },
      ],
      languages: [{ language: "English", minimumLevel: "Fluent" }],
      desiredStartDate: null,
      description: "Lead our brunch kitchen. Menu ownership and a team of six.",
      status: "live",
    },
  },
  {
    // Closed on purpose: exercises the /admin/jobs toggle and proves closed
    // jobs drop out of the candidate feed.
    id: `${SEED_PREFIX}job-bartender-closed`,
    job: {
      role: "Bartender",
      area: "Canggu",
      employmentType: "Part-time",
      salaryType: "Monthly",
      salaryMin: 5_000_000,
      salaryMax: 7_000_000,
      minimumExperience: 2,
      skills: [
        { name: "Cocktail preparation", required: true },
        { name: "Mixology", required: false },
      ],
      languages: [{ language: "English", minimumLevel: "Conversational" }],
      desiredStartDate: null,
      description: "Sunset shift bartender. (Position filled — kept for reference.)",
      status: "closed",
    },
  },
];

export const REVOLVER_JOB_ID = `${SEED_PREFIX}revolver-headbarista`;

export const REVOLVER_JOB: JobSeed = {
  role: "Barista",
  area: "Seminyak",
  employmentType: "Full-time",
  salaryType: "Monthly",
  salaryMin: 7_000_000,
  salaryMax: 9_000_000,
  minimumExperience: 2,
  skills: [
    { name: "Espresso machine", required: true },
    { name: "Latte art", required: true },
    { name: "Coffee calibration", required: false },
  ],
  languages: [{ language: "English", minimumLevel: "Conversational" }],
  desiredStartDate: null,
  description: "Seeking an experienced barista for our Seminyak flagship.",
  status: "live",
};

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

/** The candidate demo login. Gets a real Auth user; the rest are pool data. */
export const AYU: Omit<CandidateSeed, "uid"> = {
  firstName: "Ayu",
  lastName: "Pratiwi",
  area: "Berawa",
  roles: ["Barista"],
  salaryMin: 6_000_000,
  salaryMax: 7_000_000,
  availability: "Available immediately",
  languages: [
    { language: "Indonesian", level: "Native" },
    { language: "English", level: "Fluent" },
  ],
  skills: ["Espresso machine", "Latte art", "Coffee calibration", "Manual brewing"],
  experiences: [
    {
      companyName: "Revolver Canggu",
      role: "Barista",
      startDate: "2021-06-01",
      endDate: null,
      current: true,
    },
  ],
  phone: "verified",
  id: "verified",
};

export const OTHER_CANDIDATES: Omit<CandidateSeed, "uid">[] = [
  {
    firstName: "Kadek", lastName: "Sari", area: "Canggu", roles: ["Barista"],
    salaryMin: 5_000_000, salaryMax: 6_500_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Espresso machine", "Latte art", "Manual brewing"],
    experiences: [{ companyName: "Crate Café", role: "Barista", startDate: "2022-03-01", endDate: null, current: true }],
    phone: "verified", id: "not_submitted",
  },
  {
    firstName: "Wayan", lastName: "Adi", area: "Berawa", roles: ["Barista"],
    salaryMin: 6_000_000, salaryMax: 7_500_000, availability: "Available within 7 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Espresso machine", "Coffee calibration", "Latte art", "Manual brewing"],
    experiences: [{ companyName: "Secret Spot", role: "Barista", startDate: "2020-01-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    firstName: "Putu", lastName: "Yani", area: "Seminyak", roles: ["Barista", "Waiter / Waitress"],
    salaryMin: 5_500_000, salaryMax: 7_000_000, availability: "Available within 14 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Espresso machine", "Table service", "POS"],
    experiences: [{ companyName: "Sisterfields", role: "Barista", startDate: "2023-02-01", endDate: null, current: true }],
    phone: "not_submitted", id: "not_submitted",
  },
  {
    // Pending ID -> shows up in the admin verification queue.
    firstName: "Made", lastName: "Dwi", area: "Kerobokan", roles: ["Barista"],
    salaryMin: 7_000_000, salaryMax: 9_000_000, availability: "Available within 30 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Espresso machine", "Latte art", "Coffee calibration", "Grinder dialing"],
    experiences: [{ companyName: "Revolver", role: "Barista", startDate: "2019-06-01", endDate: null, current: true }],
    phone: "verified", id: "pending",
    idDocumentPath: "users/seed-cand-04/private/id-demo.jpg",
  },
  {
    firstName: "Nyoman", lastName: "Rai", area: "Umalas", roles: ["Barista"],
    salaryMin: 4_500_000, salaryMax: 6_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }],
    skills: ["Espresso machine", "Manual brewing"],
    experiences: [{ companyName: "Local warung", role: "Barista", startDate: "2023-09-01", endDate: null, current: true }],
    phone: "not_submitted", id: "not_submitted",
  },
  {
    // Pending workplace verification -> fills the second admin queue.
    firstName: "Gede", lastName: "Surya", area: "Canggu", roles: ["Barista"],
    salaryMin: 6_500_000, salaryMax: 8_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Espresso machine", "Latte art", "Coffee calibration", "Manual brewing"],
    experiences: [
      { companyName: "Milk & Madu", role: "Barista", startDate: "2021-01-01", endDate: "2024-06-01", current: false },
      { companyName: "Copenhagen", role: "Barista", startDate: "2024-07-01", endDate: null, current: true },
    ],
    phone: "verified", id: "verified", employment: "pending",
  },
  {
    firstName: "Komang", lastName: "Ayu", area: "Berawa", roles: ["Barista"],
    salaryMin: 5_000_000, salaryMax: 6_500_000, availability: "Available within 7 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Espresso machine", "Latte art"],
    experiences: [{ companyName: "Nook", role: "Barista", startDate: "2022-11-01", endDate: null, current: true }],
    phone: "verified", id: "not_submitted",
  },
  {
    firstName: "Dewa", lastName: "Putra", area: "Denpasar", roles: ["Barista"],
    salaryMin: 4_000_000, salaryMax: 5_500_000, availability: "Available within 14 days",
    languages: [{ language: "Indonesian", level: "Native" }],
    skills: ["Espresso machine"],
    experiences: [{ companyName: "Kopi Kenangan", role: "Barista", startDate: "2023-05-01", endDate: null, current: true }],
    phone: "not_submitted", id: "not_submitted",
  },
  {
    firstName: "Luh", lastName: "Sinta", area: "Canggu", roles: ["Barista"],
    salaryMin: 6_000_000, salaryMax: 7_500_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }, { language: "Russian", level: "Basic" }],
    skills: ["Espresso machine", "Latte art", "Manual brewing", "Coffee calibration"],
    experiences: [{ companyName: "Peloton Supershop", role: "Barista", startDate: "2020-08-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    firstName: "Agus", lastName: "Pratama", area: "Kuta", roles: ["Barista", "Bartender"],
    salaryMin: 5_500_000, salaryMax: 7_000_000, availability: "Available within 7 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Espresso machine", "Cocktail preparation"],
    experiences: [{ companyName: "Potato Head", role: "Barista", startDate: "2022-01-01", endDate: null, current: true }],
    phone: "verified", id: "not_submitted",
  },
  {
    firstName: "Ni", lastName: "Kadek", area: "Ubud", roles: ["Barista"],
    salaryMin: 4_500_000, salaryMax: 6_000_000, availability: "Available within 30 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Espresso machine", "Manual brewing"],
    experiences: [{ companyName: "Seniman Coffee", role: "Barista", startDate: "2021-04-01", endDate: null, current: true }],
    phone: "not_submitted", id: "not_submitted",
  },
  {
    firstName: "Bagus", lastName: "Wira", area: "Berawa", roles: ["Barista"],
    salaryMin: 7_500_000, salaryMax: 9_500_000, availability: "Available within 14 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Espresso machine", "Latte art", "Coffee calibration", "Grinder dialing", "Manual brewing"],
    experiences: [{ companyName: "Expat Roasters", role: "Head Barista", startDate: "2018-01-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    firstName: "Sari", lastName: "Melati", area: "Canggu", roles: ["Waiter / Waitress"],
    salaryMin: 4_500_000, salaryMax: 6_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["POS", "Table service", "Upselling"],
    experiences: [{ companyName: "La Brisa", role: "Waiter / Waitress", startDate: "2022-06-01", endDate: null, current: true }],
    phone: "verified", id: "not_submitted",
  },
  // --- Non-barista roles, so search filters and the other jobs return results ---
  {
    firstName: "Ketut", lastName: "Wirawan", area: "Berawa", roles: ["Waiter / Waitress"],
    salaryMin: 5_000_000, salaryMax: 6_500_000, availability: "Available within 7 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Table service", "POS", "Upselling", "Order taking"],
    experiences: [{ companyName: "Mason", role: "Waiter / Waitress", startDate: "2021-02-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    // Pending ID -> second item in the admin ID queue.
    firstName: "Ida", lastName: "Ayu Wulan", area: "Canggu", roles: ["Waiter / Waitress", "Host / Hostess"],
    salaryMin: 4_500_000, salaryMax: 6_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Table service", "POS", "Customer service"],
    experiences: [{ companyName: "The Lawn", role: "Waiter / Waitress", startDate: "2023-01-01", endDate: null, current: true }],
    phone: "verified", id: "pending",
    idDocumentPath: "users/seed-cand-15/private/id-demo.jpg",
  },
  {
    firstName: "Putu", lastName: "Ariana", area: "Kerobokan", roles: ["Chef", "Sous Chef"],
    salaryMin: 10_000_000, salaryMax: 14_000_000, availability: "Available within 30 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Menu development", "Plating", "Food safety / hygiene", "Team leadership"],
    experiences: [{ companyName: "Locavore", role: "Sous Chef", startDate: "2018-05-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    firstName: "Nengah", lastName: "Suardana", area: "Canggu", roles: ["Chef"],
    salaryMin: 9_000_000, salaryMax: 12_000_000, availability: "Available within 14 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Food preparation", "Grill", "Food safety / hygiene", "Menu development"],
    experiences: [{ companyName: "Bambu", role: "Chef", startDate: "2019-09-01", endDate: null, current: true }],
    phone: "verified", id: "not_submitted",
  },
  {
    firstName: "Wayan", lastName: "Gunawan", area: "Seminyak", roles: ["Chef", "Cook"],
    salaryMin: 8_000_000, salaryMax: 11_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Basic" }],
    skills: ["Food preparation", "Grill", "Plating"],
    experiences: [{ companyName: "Merah Putih", role: "Cook", startDate: "2020-03-01", endDate: null, current: true }],
    phone: "not_submitted", id: "not_submitted",
  },
  {
    firstName: "Kadek", lastName: "Bagas", area: "Seminyak", roles: ["Bartender"],
    salaryMin: 6_000_000, salaryMax: 8_500_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Cocktail preparation", "Mixology", "Wine knowledge"],
    experiences: [{ companyName: "La Favela", role: "Bartender", startDate: "2019-11-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    firstName: "Made", lastName: "Restu", area: "Kuta", roles: ["Bartender"],
    salaryMin: 5_500_000, salaryMax: 7_000_000, availability: "Available within 7 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Conversational" }],
    skills: ["Cocktail preparation", "Flair bartending", "Cash handling"],
    experiences: [{ companyName: "Sky Garden", role: "Bartender", startDate: "2021-07-01", endDate: null, current: true }],
    phone: "verified", id: "not_submitted",
  },
  {
    firstName: "Ni Luh", lastName: "Puspa", area: "Nusa Dua", roles: ["Receptionist", "Host / Hostess"],
    salaryMin: 5_000_000, salaryMax: 7_000_000, availability: "Available within 14 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }, { language: "Japanese", level: "Basic" }],
    skills: ["Guest check-in", "Reservations", "Booking systems", "Customer service"],
    experiences: [{ companyName: "Ayana Resort", role: "Receptionist", startDate: "2020-02-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
  },
  {
    firstName: "Komang", lastName: "Wati", area: "Ubud", roles: ["Housekeeping"],
    salaryMin: 3_500_000, salaryMax: 5_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Basic" }],
    skills: ["Room cleaning", "Laundry"],
    experiences: [{ companyName: "Como Shambhala", role: "Housekeeping", startDate: "2022-04-01", endDate: null, current: true }],
    phone: "not_submitted", id: "not_submitted",
  },
];

/** Stable synthetic uid for the Nth pool candidate (1-based). */
export function poolUid(index: number): string {
  return `${SEED_PREFIX}cand-${String(index).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Pre-staged pipeline state
// ---------------------------------------------------------------------------

/** The job that gets pre-staged pipeline state (applications, and the match). */
export const PRE_APPLIED_JOB_ID = `${SEED_PREFIX}job-barista`;

/**
 * Pool candidates who have already applied to the Milk & Madu barista job, so
 * the employer's "Applied to you" section isn't empty on first login. These
 * must be Baristas, or they won't be in that job's shortlist at all — see the
 * guard in data.test.ts.
 */
export const PRE_APPLIED_UIDS = [poolUid(1), poolUid(7), poolUid(9)];

/**
 * The pre-made match. Ayu is used deliberately: she's the one pool candidate
 * with a real Auth login, so both sides of the conversation can be opened.
 */
export const DEMO_CHAT = {
  jobId: PRE_APPLIED_JOB_ID,
  matchId: `${SEED_PREFIX}match-ayu-barista`,
  conversationId: `${SEED_PREFIX}conv-ayu-barista`,
  messages: [
    { from: "employer", body: "Hi Ayu! Loved your profile — the latte art especially. Are you still looking?" },
    { from: "candidate", body: "Hi! Yes I am. I'm available immediately and I know Berawa well." },
    { from: "employer", body: "Perfect. Could you come by for a trial shift this week?" },
  ] as const,
};
