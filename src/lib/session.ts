/**
 * Session constants shared by edge middleware, the /api/session route, and
 * server auth helpers. Keep this file free of Node-only APIs so the Edge
 * runtime (middleware) can import it.
 */

export const SESSION_COOKIE = "gojob_session";

/** 5 days, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5;
