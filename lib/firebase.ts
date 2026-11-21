import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App for Authentication
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export const ADMIN_EMAIL = 'michael.y.mosaad@gmail.com';

export function isFirebaseAdminUser(user: User | null | undefined): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email &&
      user.email.toLowerCase() === ADMIN_EMAIL
  );
}

export async function signInAdminWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  if (!isFirebaseAdminUser(result.user)) {
    const signedEmail = result.user.email || 'غير معروف';
    await signOut(auth).catch(() => undefined);
    throw new Error(
      `هذا الحساب (${signedEmail}) ليس حساب الأدمن المعتمد. يرجى تسجيل الدخول بحساب ${ADMIN_EMAIL}.`
    );
  }
  return result.user;
}

export async function signInServantWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  if (!result.user.email || !result.user.emailVerified) {
    await signOut(auth).catch(() => undefined);
    throw new Error('يجب استخدام حساب Google موثّق وبريد إلكتروني مفعّل.');
  }
  return result.user;
}

export async function signOutFirebaseAuth(): Promise<void> {
  await signOut(auth);
}
