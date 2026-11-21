import { NextRequest, NextResponse } from 'next/server';
import {
  canServantManageCoding,
  upsertPortalConfig,
} from '../../../../src/db/carnival-repository.ts';
import { verifyOptionalFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      editionId?: string;
      configKey?: 'portal' | 'coding';
      payload?: Record<string, unknown>;
      actorServantId?: string;
    };

    const editionId = body?.editionId || 'ed-carnival-2027';
    const configKey = body?.configKey;
    const payload = body?.payload;

    if (
      (configKey !== 'portal' && configKey !== 'coding') ||
      !payload ||
      typeof payload !== 'object'
    ) {
      return NextResponse.json({ error: 'Invalid config request.' }, { status: 400 });
    }

    const authCtx = await verifyOptionalFirebaseAuth(req);
    const isAdmin = Boolean(authCtx?.isAdmin);

    if (configKey === 'portal' && !isAdmin) {
      return NextResponse.json(
        { error: 'يلزم توثيق حساب Google الخاص بالأدمن لتعديل إعدادات البوابة.' },
        { status: 403 }
      );
    }

    if (configKey === 'coding' && !isAdmin) {
      const actorId = typeof body.actorServantId === 'string' ? body.actorServantId : '';
      const allowed = await canServantManageCoding(actorId);
      if (!allowed) {
        return NextResponse.json(
          { error: 'ليست لديك صلاحية تعديل بيانات التكويد.' },
          { status: 403 }
        );
      }
    }

    await upsertPortalConfig(editionId, configKey, payload, body.actorServantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update portal/coding config:', error);
    return NextResponse.json(
      { error: 'تعذر حفظ الإعدادات.' },
      { status: 500 }
    );
  }
}
