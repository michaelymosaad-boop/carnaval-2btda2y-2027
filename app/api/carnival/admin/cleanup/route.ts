import { NextRequest, NextResponse } from 'next/server';
import { cleanupDemoDataAdmin } from '../../../../../src/db/carnival-repository.ts';
import { requireAdminFirebaseAuth } from '../../../../../src/lib/auth-server.ts';

export async function POST(req: NextRequest) {
  try {
    const adminCtx = await requireAdminFirebaseAuth(req);
    if (!adminCtx) {
      return NextResponse.json(
        { error: 'لحذف السجلات القديمة، يجب توثيق حساب Google الخاص بالأدمن أولاً من الأعلى.' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      editionId?: string;
      servantIdsToDelete?: string[];
      kidIdsToDelete?: string[];
      loginCodeIdsToDelete?: string[];
      auditLogIdsToDelete?: string[];
      gateCheckinIdsToDelete?: string[];
      alertIdsToDelete?: string[];
      zeroOutLedgerEntries?: Record<string, unknown>[];
      remainingRoles?: unknown[];
    };

    const result = await cleanupDemoDataAdmin({
      editionId: body?.editionId || 'ed-carnival-2027',
      servantIdsToDelete: Array.isArray(body?.servantIdsToDelete)
        ? body.servantIdsToDelete
        : [],
      kidIdsToDelete: Array.isArray(body?.kidIdsToDelete) ? body.kidIdsToDelete : [],
      loginCodeIdsToDelete: Array.isArray(body?.loginCodeIdsToDelete)
        ? body.loginCodeIdsToDelete
        : [],
      auditLogIdsToDelete: Array.isArray(body?.auditLogIdsToDelete)
        ? body.auditLogIdsToDelete
        : [],
      gateCheckinIdsToDelete: Array.isArray(body?.gateCheckinIdsToDelete)
        ? body.gateCheckinIdsToDelete
        : [],
      alertIdsToDelete: Array.isArray(body?.alertIdsToDelete) ? body.alertIdsToDelete : [],
      zeroOutLedgerEntries: Array.isArray(body?.zeroOutLedgerEntries)
        ? body.zeroOutLedgerEntries
        : [],
      remainingRoles: Array.isArray(body?.remainingRoles) ? body.remainingRoles : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to clean up demo data:', error);
    return NextResponse.json(
      { error: 'تعذر تنظيف البيانات التجريبية.' },
      { status: 500 }
    );
  }
}
