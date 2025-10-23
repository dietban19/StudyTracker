import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
/** Reference to the user doc */
export const userDocRef = (uid) => doc(db, `users/${uid}`);

/** Ensure a user doc exists; create if missing. Returns the profile data used/merged. */
export async function ensureUserDocument(user) {
  if (!user) return null;

  const ref = userDocRef(user.uid);
  const snap = await getDoc(ref);

  const baseProfile = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    providers: (user.providerData || []).map((p) => p.providerId),
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(ref, baseProfile);
    return baseProfile;
  } else {
    // Touch lastLoginAt and keep profile fresh (don’t overwrite existing fields unnecessarily)
    await updateDoc(ref, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      providers: (user.providerData || []).map((p) => p.providerId),
      lastLoginAt: serverTimestamp(),
    });
    return { ...snap.data(), ...baseProfile };
  }
}
