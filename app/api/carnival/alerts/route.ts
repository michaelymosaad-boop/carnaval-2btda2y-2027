import { NextRequest, NextResponse } from 'next/server';
import {
  insertEmergencyAlert,
  updateEmergencyAlertRecord,
} from '../../../../src/db/carnival-repository.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid alert payload.' }, { status: 400 });
    }
    await insertEmergencyAlert(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to create emergency alert:', error);
    return NextResponse.json({ error: 'تعذر إرسال البلاغ الميداني.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      alertId?: string;
      status?: string;
      updated_by_servant_id?: string;
      resolved_by_name?: string;
      resolution_note?: string;
      updated_at?: string;
    };

    if (!body?.alertId || !body?.status || !body?.updated_by_servant_id) {
      return NextResponse.json({ error: 'Invalid alert update payload.' }, { status: 400 });
    }

    await updateEmergencyAlertRecord(body.alertId, {
      status: body.status,
      updated_by_servant_id: body.updated_by_servant_id,
      resolved_by_name: body.resolved_by_name,
      resolution_note: body.resolution_note,
      updated_at: body.updated_at || new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update emergency alert:', error);
    return NextResponse.json({ error: 'تعذر تحديث حالة البلاغ.' }, { status: 500 });
  }
}
