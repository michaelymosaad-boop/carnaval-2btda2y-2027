import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '../../../../src/db/carnival-repository.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await checkDatabaseHealth();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Service temporarily unavailable.' },
      { status: 503 }
    );
  }
}
