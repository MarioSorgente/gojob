/** Firestore collection / subcollection names, in one place. */
export const COLLECTIONS = {
  users: "users",
  candidates: "candidates",
  businesses: "businesses",
  jobs: "jobs",
  /** Subcollection of a job: the ranked (job, candidate) shortlist. */
  shortlist: "shortlist",
  /** Candidate-owned, precomputed job ranking. */
  recommendations: "recommendations",
  /** Durable Firestore-backed work queue for ranking fan-outs. */
  recommendationTasks: "recommendationTasks",
  /** Temporary fallback rankings used while projections are being deployed. */
  recommendationWindows: "recommendationWindows",
  matches: "matches",
  conversations: "conversations",
  /** Per-user notification counters, keyed by the user's uid. */
  userStats: "userStats",
  /** Subcollection of a conversation. */
  messages: "messages",
  interviews: "interviews",
  hires: "hires",
  skills: "skills",
} as const;
