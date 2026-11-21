import { NextRequest, NextResponse } from 'next/server';
import {
  deleteKidById,
  updateKidTeam,
} from '../../../../../src/db/carnival-repository.ts';
import { requireAdminFirebaseAuth } from '../../../../../src/lib/auth-server.ts';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      team_name?: string;
      updated_by_servant_id?: string;
    };

    if (!id || typeof body?.team_name !== 'string') {
      return NextResponse.json({ error: 'Invalid team update payload.' }, { status: 400 });
    }

    await updateKidTeam(
      id,
      body.team_name,
      body.updated_by_servant_id || 'system'
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update kid team:', error);
    return NextResponse.json({ error: 'تعذر تحديث فريق المخدوم.' }, { status: 500 });
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
        { error: 'يلزم توثيق حساب Google الخاص بالأدمن لحذف المخدومين.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    await deleteKidById(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete kid:', error);
    return NextResponse.json({ error: 'تعذر حذف المخدوم.' }, { status: 500 });
  }
}
