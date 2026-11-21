import { NextRequest, NextResponse } from 'next/server';
import { upsertKid } from '../../../../src/db/carnival-repository.ts';
import { verifyOptionalFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid kid payload.' }, { status: 400 });
    }

    const authCtx = await verifyOptionalFirebaseAuth(req);
    await upsertKid(body, { isAdmin: Boolean(authCtx?.isAdmin) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to save kid:', error);
    return NextResponse.json({ error: 'تعذر حفظ بيانات المخدوم.' }, { status: 500 });
  }
}
