// src/firebase/auth.js
//
// All Firebase Authentication logic lives here: resolving a Student ID
// or email into a sign-in call, mapping Firebase error codes to
// friendly messages, logout, and an auth-state subscription used by
// AuthContext.

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { resolveEmailFromStudentId } from "./firestore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Student IDs: letters/digits/hyphens only, reasonable length bounds.
// This also acts as a basic guard against malformed/injection-style input
// before it ever reaches a Firestore query.
const STUDENT_ID_REGEX = /^[A-Za-z0-9-]{3,20}$/;

export class AuthError extends Error {}

function sanitize(value) {
  return String(value ?? "").trim();
}

/**
 * Log in with either a Student ID or a university email, plus password.
 * Throws AuthError with a user-friendly message on any failure.
 */
export async function loginWithIdentifier(identifierRaw, passwordRaw) {
  const identifier = sanitize(identifierRaw);
  const password = sanitize(passwordRaw) === "" ? "" : String(passwordRaw);

  if (!identifier || !password) {
    throw new AuthError("Please enter your Student ID / email and password.");
  }

  let email;

  if (EMAIL_REGEX.test(identifier)) {
    email = identifier.toLowerCase();
  } else if (STUDENT_ID_REGEX.test(identifier)) {
    let resolved;
    try {
      resolved = await resolveEmailFromStudentId(identifier);
    } catch (err) {
      throw new AuthError("Couldn't verify that Student ID right now. Please try again.");
    }
    if (!resolved) {
      throw new AuthError("We couldn't find an account with that Student ID.");
    }
    email = resolved;
  } else {
    throw new AuthError("Enter a valid Student ID or university email.");
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (err) {
    throw new AuthError(mapFirebaseAuthError(err));
  }
}

export async function logout() {
  await signOut(auth);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

function mapFirebaseAuthError(err) {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect ID/email or password.";
    case "auth/invalid-email":
      return "That doesn't look like a valid university email.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your lab administrator.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return "Something went wrong while signing in. Please try again.";
  }
}
