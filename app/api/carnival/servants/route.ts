import { NextRequest, NextResponse } from 'next/server';
import { upsertServant } from '../../../../src/db/carnival-repository.ts';
import { verifyOptionalFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid servant payload.' }, { status: 400 });
    }

    const authCtx = await verifyOptionalFirebaseAuth(req);
    await upsertServant(body, { isAdmin: Boolean(authCtx?.isAdmin) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Only administrators') || msg.includes('Cannot modify')) {
      return NextResponse.json(
        { error: 'يلزم توثيق حساب Google الخاص بالأدمن لتعديل بيانات خادم مسجل مسبقاً.' },
        { status: 403 }
      );
    }
    console.error('Failed to save servant:', error);
    return NextResponse.json({ error: 'تعذر حفظ بيانات الخادم.' }, { status: 500 });
  }
}
