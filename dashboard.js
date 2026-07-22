// dashboard.js / modules.js
// Firestore replacement for localStorage.getItem/setItem
// All reads/writes are scoped to the logged-in user's uid

import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, requireAuth, renderAuthUI } from "./auth.js";

const db = getFirestore();

// ---- Internal helper: get current user or throw ----
function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in. Cannot read/write user data.");
  }
  return user;
}

// ---- Replacement for localStorage.setItem(key, value) ----
// Stores a single field inside the user's document: users/{uid}
export async function setUserItem(key, value) {
  const user = requireUser();
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, { [key]: value }, { merge: true });
}

// ---- Replacement for localStorage.getItem(key) ----
export async function getUserItem(key) {
  const user = requireUser();
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data()[key] ?? null;
}

// ---- Get the user's entire data object at once ----
// Useful on dashboard load instead of many separate getItem calls
export async function getUserData() {
  const user = requireUser();
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : {};
}

// ---- Update multiple fields at once ----
// Replacement for a batch of setItem calls, e.g. saving game progress
export async function updateUserData(fields) {
  const user = requireUser();
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, fields, { merge: true });
}

// ---- Example: save game progress ----
export async function saveProgress(level, score) {
  await updateUserData({
    lastLevel: level,
    lastScore: score,
    updatedAt: Date.now()
  });
}

// ---- Example: load game progress on dashboard init ----
export async function loadDashboard() {
  const data = await getUserData();
  return {
    level: data.lastLevel ?? 1,
    score: data.lastScore ?? 0,
    settings: data.settings ?? {}
  };
}

// ==========================================================================
// PAGE INIT — this is what was missing. dashboard.html only loads this
// file, so this file (not modules.js) has to be the one enforcing login
// and hiding the loading overlay on THIS page.
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Blocks here until login is confirmed; redirects to index.html and
  // never resolves if no user is signed in.
  await requireAuth('index.html');

  // Wire up the sidebar user card with the logged-in user's name/email
  // and the account switch/logout menu.
  renderAuthUI();

  // Safe to reveal the page now
  const overlay = document.getElementById('auth-loading-overlay');
  if (overlay) overlay.style.display = 'none';
});