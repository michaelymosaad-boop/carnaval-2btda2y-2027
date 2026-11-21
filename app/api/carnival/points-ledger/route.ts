import { NextRequest, NextResponse } from 'next/server';
import { insertPointsLedgerEntry } from '../../../../src/db/carnival-repository.ts';
import { verifyOptionalFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid points entry payload.' }, { status: 400 });
    }

    const authCtx = await verifyOptionalFirebaseAuth(req);
    await insertPointsLedgerEntry(body, { isAdmin: Boolean(authCtx?.isAdmin) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only administrators')) {
      return NextResponse.json(
        { error: 'القيد التصحيحي للنقاط متاح للأدمن الموثّق فقط.' },
        { status: 403 }
      );
    }
    console.error('Failed to record points ledger entry:', error);
    return NextResponse.json({ error: 'تعذر رصد النقاط.' }, { status: 500 });
  }
}
