import { NextRequest, NextResponse } from 'next/server';
import { completeAdminBootstrap } from '../../../../src/db/carnival-repository.ts';
import { verifyOptionalFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      editionId?: string;
      servantId?: string;
      adminEmail?: string;
      username?: string;
      passwordHash?: string;
      seedAdminServant?: Record<string, unknown>;
    };

    if (!body?.username || !body?.passwordHash) {
      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان.' },
        { status: 400 }
      );
    }

    const authCtx = await verifyOptionalFirebaseAuth(req);

    await completeAdminBootstrap({
      editionId: body.editionId || 'ed-carnival-2027',
      servantId: body.servantId || 's-admin-1',
      adminEmail: body.adminEmail || 'Michael.Y.Mosaad@gmail.com',
      username: body.username,
      passwordHash: body.passwordHash,
      isAdminToken: Boolean(authCtx?.isAdmin),
      seedAdminServant: body.seedAdminServant,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('already activated')
        ? 'تم تفعيل حساب الأدمن مسبقاً؛ يلزم توثيق حساب Google الخاص بالأدمن.'
        : 'تعذر تفعيل بيانات دخول الأدمن.';
    console.error('Admin bootstrap error:', error);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
