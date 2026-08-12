/**
 * Seed the Firebase emulator with demo data for the GoJob demo story (scope §31).
 *
 * Run with the emulators up:
 *   npm run emulators           # in one terminal
 *   npm run seed                # in another
 *
 * Creates:
 *   - Employer login + business "Milk & Madu" (Canggu)
 *   - A second verified business "Revolver Café" with a live Head Barista job
 *   - Candidate login "Ayu Pratiwi" + 13 more candidates (mostly Baristas)
 *
 * Demo logins (password for all): demo1234
 *   employer:  owner@milkandmadu.demo
 *   candidate: ayu@gojob.demo
 */

import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminAppOptions } from "../src/lib/firebase/credentials";
import { computeMatch } from "../src/lib/matching";
import { computeProfileStrength } from "../src/lib/profileStrength";
import { totalExperienceYears } from "../src/lib/dates";
import { COLLECTIONS } from "../src/lib/collections";
import type {
  Business,
  CandidateLanguage,
  CandidateProfile,
  CandidateSummary,
  Experience,
  Job,
  JobCandidate,
  SkillRef,
  VerificationStatus,
} from "../src/lib/types";

config({ path: ".env.local" });

/** `--prod` seeds the real Firebase project; default seeds the local emulator. */
const PROD = process.argv.includes("--prod");

if (PROD) {
  // Target the real project: strip any emulator routing from the env.
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "0";
} else {
  // Default: local emulator, no credentials required.
  process.env.FIRESTORE_EMULATOR_HOST ||= "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "localhost:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "localhost:9199";
}

const PASSWORD = "demo1234";

function buildApp(): App {
  if (getApps().length) return getApps()[0];
  if (PROD) {
    // Simplest path: GOOGLE_APPLICATION_CREDENTIALS points at the downloaded
    // serviceAccount.json. cert() reads the file; project id comes from it.
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath && existsSync(keyPath)) {
      const raw = JSON.parse(readFileSync(keyPath, "utf8")) as { project_id?: string };
      return initializeApp({ credential: cert(keyPath), projectId: raw.project_id });
    }
    return initializeApp(adminAppOptions());
  }
  return initializeApp(adminAppOptions());
}

const app = buildApp();
const PROJECT_ID = app.options.projectId || "demo-gojob";

if (PROD && PROJECT_ID === "demo-gojob") {
  console.error(
    "Refusing to seed: no real credentials found.\n" +
      "Point GOOGLE_APPLICATION_CREDENTIALS at your serviceAccount.json (or set the\n" +
      "FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY vars) in .env.local, then retry.",
  );
  process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

const now = () => new Date().toISOString();

async function ensureAuthUser(
  email: string,
  displayName: string,
): Promise<string> {
  try {
    const u = await auth.createUser({ email, password: PASSWORD, displayName });
    return u.uid;
  } catch (e) {
    if ((e as { code?: string }).code === "auth/email-already-exists") {
      return (await auth.getUserByEmail(email)).uid;
    }
    throw e;
  }
}

async function writeUser(
  uid: string,
  data: { email: string | null; phone: string | null; role: string; displayName: string },
) {
  await db.collection(COLLECTIONS.users).doc(uid).set({
    email: data.email,
    phone: data.phone,
    role: data.role,
    displayName: data.displayName,
    language: "en",
    onboardingComplete: true,
    createdAt: now(),
  });
}

function toSummary(c: CandidateProfile): CandidateSummary {
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

interface CandidateSeed {
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
}

function buildCandidate(seed: CandidateSeed): CandidateProfile {
  const experiences: Experience[] = seed.experiences.map((e, i) => ({
    id: `${seed.uid}-exp-${i}`,
    companyName: e.companyName,
    role: e.role,
    startDate: e.startDate,
    endDate: e.current ? null : e.endDate,
    current: e.current,
    description: "",
    verificationStatus: "not_submitted",
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
    availability: { type: seed.availability, availableFrom: null } as CandidateProfile["availability"],
    languages: seed.languages,
    skills,
    experiences,
    profileStrength: 0,
    verification: { phone: seed.phone, id: seed.id, employment: "not_submitted" },
    createdAt: now(),
    updatedAt: now(),
  };
  profile.profileStrength = computeProfileStrength(profile).percent;
  return profile;
}

async function writeCandidate(profile: CandidateProfile, email: string | null) {
  await db.collection(COLLECTIONS.candidates).doc(profile.userId).set(profile);
  await writeUser(profile.userId, {
    email,
    phone: profile.verification.phone === "verified" ? "+6281100000000" : null,
    role: "candidate",
    displayName: `${profile.firstName} ${profile.lastName}`,
  });
}

async function writeBusiness(
  id: string,
  ownerId: string,
  data: Omit<Business, "id" | "ownerId" | "createdAt">,
): Promise<Business> {
  const business: Business = { id, ownerId, createdAt: now(), ...data };
  await db.collection(COLLECTIONS.businesses).doc(id).set(business);
  return business;
}

async function createJobWithShortlist(
  jobId: string,
  job: Omit<Job, "id" | "createdAt">,
  candidates: CandidateProfile[],
) {
  const fullJob: Job = { id: jobId, createdAt: now(), ...job };
  await db.collection(COLLECTIONS.jobs).doc(jobId).set(fullJob);

  const pool = candidates.filter((c) =>
    c.roles.some((r) => r.toLowerCase() === job.role.toLowerCase()),
  );
  const batch = db.batch();
  for (const c of pool) {
    const { score, breakdown, reasons } = computeMatch(fullJob, c);
    const entry: JobCandidate = {
      jobId,
      candidateId: c.userId,
      businessId: job.businessId,
      score,
      breakdown,
      reasons,
      employerAction: "none",
      candidateAction: "none",
      stage: "recommended",
      matchId: null,
      conversationId: null,
      candidateSummary: toSummary(c),
      createdAt: now(),
      updatedAt: now(),
    };
    batch.set(
      db
        .collection(COLLECTIONS.jobs)
        .doc(jobId)
        .collection(COLLECTIONS.shortlist)
        .doc(c.userId),
      entry,
    );
  }
  await batch.commit();
  return pool.length;
}

// ---------------------------------------------------------------------------
// Candidate seed data
// ---------------------------------------------------------------------------

const OTHER_CANDIDATES: Omit<CandidateSeed, "uid">[] = [
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
    firstName: "Made", lastName: "Dwi", area: "Kerobokan", roles: ["Barista"],
    salaryMin: 7_000_000, salaryMax: 9_000_000, availability: "Available within 30 days",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Espresso machine", "Latte art", "Coffee calibration", "Grinder dialing"],
    experiences: [{ companyName: "Revolver", role: "Barista", startDate: "2019-06-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
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
    firstName: "Gede", lastName: "Surya", area: "Canggu", roles: ["Barista"],
    salaryMin: 6_500_000, salaryMax: 8_000_000, availability: "Available immediately",
    languages: [{ language: "Indonesian", level: "Native" }, { language: "English", level: "Fluent" }],
    skills: ["Espresso machine", "Latte art", "Coffee calibration", "Manual brewing"],
    experiences: [{ companyName: "Milk & Madu", role: "Barista", startDate: "2021-01-01", endDate: "2024-06-01", current: false }, { companyName: "Copenhagen", role: "Barista", startDate: "2024-07-01", endDate: null, current: true }],
    phone: "verified", id: "verified",
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
];

async function main() {
  console.log(`Seeding project "${PROJECT_ID}" (${PROD ? "PRODUCTION" : "emulator"})…`);

  // --- Admin ---
  const adminUid = await ensureAuthUser("admin@gojob.demo", "GoJob Admin");
  await writeUser(adminUid, {
    email: "admin@gojob.demo",
    phone: null,
    role: "admin",
    displayName: "GoJob Admin",
  });

  // --- Employer + business ---
  const employerUid = await ensureAuthUser("owner@milkandmadu.demo", "Milk & Madu Owner");
  await writeUser(employerUid, {
    email: "owner@milkandmadu.demo",
    phone: null,
    role: "employer",
    displayName: "Milk & Madu Owner",
  });
  await writeBusiness("seed-milk-madu", employerUid, {
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
  });

  // --- Candidates ---
  const candidates: CandidateProfile[] = [];

  const ayuUid = await ensureAuthUser("ayu@gojob.demo", "Ayu Pratiwi");
  const ayu = buildCandidate({
    uid: ayuUid,
    firstName: "Ayu", lastName: "Pratiwi", area: "Berawa", roles: ["Barista"],
    salaryMin: 6_000_000, salaryMax: 7_000_000, availability: "Available immediately",
    languages: [
      { language: "Indonesian", level: "Native" },
      { language: "English", level: "Fluent" },
    ],
    skills: ["Espresso machine", "Latte art", "Coffee calibration", "Manual brewing"],
    experiences: [
      { companyName: "Revolver Canggu", role: "Barista", startDate: "2021-06-01", endDate: null, current: true },
    ],
    phone: "verified", id: "verified",
  });
  await writeCandidate(ayu, "ayu@gojob.demo");
  candidates.push(ayu);

  for (let i = 0; i < OTHER_CANDIDATES.length; i++) {
    const seed = { uid: `seed-cand-${String(i + 1).padStart(2, "0")}`, ...OTHER_CANDIDATES[i] };
    const profile = buildCandidate(seed);
    await writeCandidate(profile, null);
    candidates.push(profile);
  }

  // --- A second business (separate owner) with a live job so candidates see
  // recommendations immediately. Kept off the demo employer's account so their
  // dashboard shows exactly one venue. ---
  await writeBusiness("seed-revolver", "seed-revolver-owner", {
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
  });
  const revolverMatches = await createJobWithShortlist(
    "seed-revolver-headbarista",
    {
      businessId: "seed-revolver",
      ownerId: "seed-revolver-owner",
      businessName: "Revolver Café",
      businessVerified: true,
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
    },
    candidates,
  );

  console.log(`✓ Seeded 1 employer, 2 businesses, ${candidates.length} candidates.`);
  console.log(`✓ Revolver Head Barista job shortlisted ${revolverMatches} candidates.`);
  console.log("\nDemo logins (password: demo1234):");
  console.log("  Employer:  owner@milkandmadu.demo");
  console.log("  Candidate: ayu@gojob.demo");
  console.log("  Admin:     admin@gojob.demo  → /admin");
  console.log("\nNext: log in as the employer and post a Barista job to see the pool.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
