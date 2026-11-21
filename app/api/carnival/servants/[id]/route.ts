import { NextRequest, NextResponse } from 'next/server';
import {
  deleteServantById,
  patchServantSafeFields,
} from '../../../../../src/db/carnival-repository.ts';
import { requireAdminFirebaseAuth } from '../../../../../src/lib/auth-server.ts';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      custom_password_hash?: string;
      username?: string;
      avatar_url?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: 'Missing servant ID.' }, { status: 400 });
    }

    await patchServantSafeFields(id, {
      custom_password_hash: body?.custom_password_hash,
      username: body?.username,
      avatar_url: body?.avatar_url,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to patch servant:', error);
    return NextResponse.json({ error: 'تعذر تحديث بيانات الحساب.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminCtx = await requireAdminFirebaseAuth(req);
    if (!adminCtx) {
      return NextResponse.json(
        { error: 'يلزم توثيق حساب Google الخاص بالأدمن لحذف الخدام.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    await deleteServantById(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete servant:', error);
    return NextResponse.json({ error: 'تعذر حذف الخادم.' }, { status: 500 });
  }
}
