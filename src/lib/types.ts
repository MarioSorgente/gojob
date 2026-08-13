/**
 * GoJob domain types.
 *
 * These mirror the Firestore document shapes. Dates are stored as ISO 8601
 * strings (e.g. "2026-08-11" for calendar dates, full ISO for timestamps) to
 * keep the client SDK and Admin SDK in agreement without Timestamp juggling.
 */

import type {
  Area,
  AvailabilityType,
  BusinessCategory,
  EmploymentType,
  ProficiencyLevel,
  Role,
  SalaryType,
} from "./taxonomy";

export type UserRole = "candidate" | "employer" | "admin";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

/** Employer-side action on a candidate within a job's shortlist. */
export type EmployerAction = "none" | "passed" | "saved" | "invited";

/** Candidate-side action on a job. */
export type CandidateAction = "none" | "applied" | "passed";

/** Stage of a (job, candidate) pair in the hiring pipeline (scope §16). */
export type PipelineStage =
  | "recommended"
  | "applied"
  | "matched"
  | "interview"
  | "hired"
  | "rejected";

// ---------------------------------------------------------------------------
// User & candidate
// ---------------------------------------------------------------------------

export interface AppUser {
  uid: string;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  displayName: string | null;
  language: string | null;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface CandidateLanguage {
  language: string;
  level: ProficiencyLevel;
}

export interface SkillRef {
  id?: string;
  name: string;
  category?: string;
}

export interface Experience {
  id: string;
  companyName: string;
  role: string;
  startDate: string; // ISO date
  endDate: string | null; // null when currently working there
  current: boolean;
  description: string;
  verificationStatus: VerificationStatus;
}

export interface SalaryExpectation {
  type: SalaryType;
  min: number | null;
  max: number | null;
}

export interface Availability {
  type: AvailabilityType;
  availableFrom: string | null; // ISO date when type === "Custom date"
}

export interface CandidateVerification {
  phone: VerificationStatus;
  id: VerificationStatus;
  employment: VerificationStatus;
}

export interface CandidateProfile {
  userId: string; // === uid
  firstName: string;
  lastName: string;
  photo: string | null;
  nationality: string;
  workEligibility: boolean;
  area: Area;
  roles: Role[];
  employmentTypes: EmploymentType[];
  salary: SalaryExpectation;
  availability: Availability;
  languages: CandidateLanguage[];
  skills: SkillRef[];
  experiences: Experience[];
  profileStrength: number; // 0..100
  verification: CandidateVerification;
  /** Storage path of the uploaded ID document, when submitted (scope §5). */
  idDocumentPath?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Business & job
// ---------------------------------------------------------------------------

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  category: BusinessCategory;
  area: Area;
  address: string;
  instagram: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  logo: string | null;
  description: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface JobSkill {
  id?: string;
  name: string;
  required: boolean;
}

export interface JobLanguage {
  language: string;
  minimumLevel: ProficiencyLevel;
}

export type JobStatus = "draft" | "live" | "closed";

/**
 * Whether a job's shortlist has finished generating. Scoring the pool happens
 * off the request that publishes the job, so the UI needs to know when the
 * results are complete rather than merely empty.
 *
 * Optional on Job: documents written before this existed have no value, and
 * are treated as "ready".
 */
export type ShortlistStatus = "pending" | "ready" | "failed";

export interface Job {
  id: string;
  businessId: string;
  ownerId: string;
  businessName: string; // denormalized for candidate-facing cards
  businessVerified: boolean; // denormalized
  role: Role;
  area: Area;
  employmentType: EmploymentType;
  salaryType: SalaryType;
  salaryMin: number | null;
  salaryMax: number | null;
  minimumExperience: number; // years
  skills: JobSkill[];
  languages: JobLanguage[];
  desiredStartDate: string | null; // ISO date
  description: string;
  status: JobStatus;
  createdAt: string;
  shortlistStatus?: ShortlistStatus;
  /** Size of the generated shortlist, once known. */
  shortlistCount?: number;
  shortlistUpdatedAt?: string;
}

// ---------------------------------------------------------------------------
// Matching & pipeline
// ---------------------------------------------------------------------------

export interface MatchBreakdown {
  role: number;
  experience: number;
  skills: number;
  salary: number;
  location: number;
  availability: number;
  profileStrength: number;
}

/** Compact candidate fields denormalized onto shortlist docs for fast cards. */
export interface CandidateSummary {
  firstName: string;
  lastName: string;
  photo: string | null;
  area: Area;
  primaryRole: string;
  yearsExperience: number;
  salary: SalaryExpectation;
  availability: Availability;
  languages: CandidateLanguage[];
  verification: CandidateVerification;
}

/**
 * A (job, candidate) pair. Stored at `jobs/{jobId}/shortlist/{candidateId}`
 * — named `shortlist`, not `candidates`, so the collection-group query in
 * pipeline.ts doesn't collide with the top-level `candidates` collection.
 * Denormalizes the scope's CandidateJobMatch + Application + Invitation + Match
 * per pair, and drives the swipe deck and the hiring pipeline.
 */
export interface JobCandidate {
  jobId: string;
  candidateId: string;
  businessId: string;
  score: number; // 0..100
  breakdown: MatchBreakdown;
  reasons: string[];
  employerAction: EmployerAction;
  candidateAction: CandidateAction;
  stage: PipelineStage;
  matchId: string | null;
  conversationId: string | null;
  candidateSummary: CandidateSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  jobId: string;
  businessId: string;
  candidateId: string;
  participants: string[]; // [employerUid, candidateUid]
  createdAt: string;
}

export interface Conversation {
  id: string;
  matchId: string;
  jobId: string;
  businessId: string;
  candidateId: string;
  participants: string[]; // [employerUid, candidateUid]
  jobRole: string;
  businessName: string;
  candidateName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: Record<string, number>; // uid -> unread count
  createdAt: string;
  /** Creation time initially; advances whenever a message is sent. */
  activityAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export type InterviewStatus = "proposed" | "accepted" | "declined";

export interface Interview {
  id: string;
  matchId: string;
  conversationId: string;
  jobId: string;
  proposedBy: string; // uid
  date: string; // ISO date
  time: string; // "HH:mm"
  location: string;
  status: InterviewStatus;
  createdAt: string;
}

export interface Hire {
  id: string;
  jobId: string;
  candidateId: string;
  businessId: string;
  date: string;
  createdAt: string;
}
