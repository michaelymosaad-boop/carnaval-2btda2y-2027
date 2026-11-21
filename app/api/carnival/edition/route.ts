import { NextRequest, NextResponse } from 'next/server';
import { upsertEdition } from '../../../../src/db/carnival-repository.ts';
import { requireAdminFirebaseAuth } from '../../../../src/lib/auth-server.ts';

export async function PUT(req: NextRequest) {
  try {
    const adminCtx = await requireAdminFirebaseAuth(req);
    if (!adminCtx) {
      return NextResponse.json(
        { error: 'يلزم توثيق حساب Google الخاص بالأدمن لتعديل بيانات الدورة.' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid edition data.' }, { status: 400 });
    }

    await upsertEdition(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update edition:', error);
    return NextResponse.json(
      { error: 'تعذر حفظ بيانات دورة الكرنفال.' },
      { status: 500 }
    );
  }
}
