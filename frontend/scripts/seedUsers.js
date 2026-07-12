/**
 * scripts/seedUsers.js
 *
 * One-time / safely re-runnable admin script that creates the two
 * predefined student accounts in Firebase Authentication AND writes
 * their matching Firestore documents:
 *   - users/{uid}                 full profile (owner-read-only)
 *   - studentDirectory/{studentId} { email }  (public read, for login lookup)
 *
 * This uses the Firebase Admin SDK, which bypasses Firestore Security
 * Rules by design. Per firestore.rules, this script — or a future
 * server-side backend using the Admin SDK — is the ONLY thing allowed
 * to create, update, or delete user accounts. No client can do this.
 *
 * SETUP
 *   1. Firebase Console → Project Settings → Service Accounts
 *      → "Generate new private key" → save as scripts/serviceAccountKey.json
 *      (this file is gitignored — never commit it)
 *   2. cd scripts && npm install
 *   3. GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run seed
 *
 * Re-running this script is safe: existing users/documents are matched
 * by email/studentId and updated in place rather than duplicated.
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const auth = admin.auth();
const db = admin.firestore();

const INITIAL_USERS = [
  {
    studentId: "202012345",
    email: "student1@ptuk.edu.ps",
    password: "Student@123",
    fullName: "Student One",
    role: "student",
    active: true,
  },
  {
    studentId: "202012346",
    email: "student2@ptuk.edu.ps",
    password: "Student@123",
    fullName: "Student Two",
    role: "student",
    active: true,
  },
];

async function upsertUser(u) {
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(u.email);
    console.log(`✓ Auth user already exists: ${u.email} (${userRecord.uid})`);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    userRecord = await auth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.fullName,
      emailVerified: true,
    });
    console.log(`+ Created auth user: ${u.email} (${userRecord.uid})`);
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      studentId: u.studentId,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      active: u.active,
    },
    { merge: true }
  );

  await db.collection("studentDirectory").doc(u.studentId).set(
    { email: u.email },
    { merge: true }
  );

  console.log(`  → Firestore profile + directory entry written for ${u.studentId}`);
}

async function main() {
  for (const u of INITIAL_USERS) {
    await upsertUser(u);
  }
  console.log("\nDone. Both users are ready to log in.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
