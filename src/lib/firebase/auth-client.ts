"use client";

/**
 * Browser-side authentication helpers. Every successful sign-in exchanges the
 * Firebase ID token for an httpOnly session cookie via /api/session so the
 * server can authenticate subsequent requests.
 */

import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "./client";

/** POST the current ID token to mint a session cookie. */
async function establishSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Could not establish session");
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await establishSession(cred.user);
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await establishSession(cred.user);
}

export async function loginWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await establishSession(cred.user);
}

/** Phone OTP — step 1. Returns a confirmation to complete with the code. */
export async function startPhoneSignIn(
  phoneNumber: string,
  recaptchaContainerId: string,
): Promise<ConfirmationResult> {
  // In the emulator, reCAPTCHA is bypassed but a verifier is still required.
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1") {
    auth.settings.appVerificationDisabledForTesting = true;
  }
  const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: "invisible",
  });
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

/** Phone OTP — step 2. */
export async function confirmPhoneCode(
  confirmation: ConfirmationResult,
  code: string,
): Promise<void> {
  const cred = await confirmation.confirm(code);
  await establishSession(cred.user);
}

export async function logout(): Promise<void> {
  await fetch("/api/session", { method: "DELETE" });
  await signOut(auth);
}
