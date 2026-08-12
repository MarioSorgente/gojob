/** Firestore collection / subcollection names, in one place. */
export const COLLECTIONS = {
  users: "users",
  candidates: "candidates",
  businesses: "businesses",
  jobs: "jobs",
  /** Subcollection of a job: the ranked (job, candidate) shortlist. */
  shortlist: "shortlist",
  matches: "matches",
  conversations: "conversations",
  /** Subcollection of a conversation. */
  messages: "messages",
  interviews: "interviews",
  hires: "hires",
  skills: "skills",
} as const;
