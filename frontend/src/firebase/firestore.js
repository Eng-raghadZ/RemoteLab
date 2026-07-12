// src/firebase/firestore.js
//
// Read-only Firestore helpers. There are intentionally NO write
// functions here on the client: user accounts are created exclusively
// by the admin seed script (scripts/seedUsers.js) using the Firebase
// Admin SDK, per the security model in firestore.rules.

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const USERS_COLLECTION = "users";
const STUDENT_DIRECTORY_COLLECTION = "studentDirectory";

/**
 * Resolve a Student ID to its associated university email.
 *
 * This reads from the `studentDirectory` collection, a minimal public
 * mapping (studentId -> email only, nothing else) that exists purely so
 * the login form can turn a Student ID into an email BEFORE the user is
 * authenticated. See firestore.rules for the exact read/write rules.
 *
 * Returns the email string, or null if no matching student was found.
 */
export async function resolveEmailFromStudentId(studentId) {
  const ref = doc(db, STUDENT_DIRECTORY_COLLECTION, studentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return typeof data.email === "string" ? data.email : null;
}

/**
 * Fetch the full profile for the currently authenticated user.
 * Firestore rules only allow a user to read their OWN profile document
 * (doc id === their Firebase Auth uid), so this must be called after
 * sign-in succeeds.
 */
export async function getUserProfile(uid) {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}
