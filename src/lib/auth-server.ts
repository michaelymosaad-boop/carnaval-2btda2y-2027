import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export const ADMIN_EMAIL = 'michael.y.mosaad@gmail.com';

export interface VerifiedAuthContext {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

export async function verifyOptionalFirebaseAuth(
  req: NextRequest
): Promise<VerifiedAuthContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const emailVerified = Boolean(decoded.email_verified);
    const isAdmin = Boolean(emailVerified && email === ADMIN_EMAIL);

    // Sync authenticated Firebase user into PostgreSQL users table
    if (decoded.uid && email) {
      await getOrCreateUser(decoded.uid, email, isAdmin ? 'admin' : 'servant').catch((err) => {
        console.warn('User sync skipped:', err);
      });
    }

    return {
      uid: decoded.uid,
      email,
      emailVerified,
      isAdmin,
    };
  } catch {
    return null;
  }
}

export async function requireAdminFirebaseAuth(
  req: NextRequest
): Promise<VerifiedAuthContext | null> {
  const ctx = await verifyOptionalFirebaseAuth(req);
  if (!ctx || !ctx.isAdmin) {
    return null;
  }
  return ctx;
}
