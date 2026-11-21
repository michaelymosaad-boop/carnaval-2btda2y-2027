import { NextRequest, NextResponse } from 'next/server';
import { seedInitialData } from '../../../../src/db/carnival-repository.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      edition?: Record<string, unknown>;
      adminServant?: Record<string, unknown>;
      adminAuthConfig?: Record<string, unknown>;
    };

    if (!body?.edition || typeof body.edition !== 'object') {
      return NextResponse.json({ error: 'Invalid edition payload.' }, { status: 400 });
    }

    await seedInitialData({
      edition: body.edition,
      adminServant: body.adminServant,
      adminAuthConfig: body.adminAuthConfig,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to seed initial data:', error);
    return NextResponse.json(
      { error: 'تعذر تهيئة البيانات الأولية.' },
      { status: 500 }
    );
  }
}
