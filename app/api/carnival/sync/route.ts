import { NextRequest, NextResponse } from 'next/server';
import { getFullCarnivalSnapshot } from '../../../../src/db/carnival-repository.ts';
import { verifyOptionalFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const editionId = req.nextUrl.searchParams.get('editionId') || 'ed-carnival-2027';
    const authCtx = await verifyOptionalFirebaseAuth(req);
    const includePrivatePii = Boolean(authCtx?.isAdmin);

    const snapshot = await getFullCarnivalSnapshot(editionId, includePrivatePii);
    return NextResponse.json({
      ...snapshot,
      isAdminView: includePrivatePii,
    });
  } catch (error) {
    console.error('Failed to load carnival sync snapshot:', error);
    return NextResponse.json(
      { error: 'تعذر تحميل البيانات من الخادم حالياً.' },
      { status: 500 }
    );
  }
}
