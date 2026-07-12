// src/context/AuthContext.jsx
//
// Wraps the app and exposes { user, profile, initializing } to any
// component via useAuth(). `user` is the raw Firebase Auth user object;
// `profile` is the matching Firestore document (fullName, role, etc).

import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthChanges } from "../firebase/auth";
import { getUserProfile } from "../firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // `initializing` is true only until Firebase reports the initial auth
  // state — used to avoid a flash of the login page for already-signed-in
  // users, and to avoid redirecting too early.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const p = await getUserProfile(firebaseUser.uid);
          setProfile(p);
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
