import { NextRequest, NextResponse } from 'next/server';
import {
  markLoginCodeUsed,
  upsertLoginCode,
} from '../../../../src/db/carnival-repository.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid login code payload.' }, { status: 400 });
    }
    await upsertLoginCode(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to save login code:', error);
    return NextResponse.json({ error: 'تعذر حفظ كود الدخول.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: string; used_at?: string };
    if (!body?.id || !body?.used_at) {
      return NextResponse.json({ error: 'Invalid login code update.' }, { status: 400 });
    }
    await markLoginCodeUsed(body.id, body.used_at);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to mark login code used:', error);
    return NextResponse.json({ error: 'تعذر تحديث حالة كود الدخول.' }, { status: 500 });
  }
}
