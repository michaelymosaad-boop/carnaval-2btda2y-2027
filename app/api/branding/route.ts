import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { INITIAL_AXES, type AxisItem } from '@/lib/carnival-store';

export interface CarnivalInfoHistoryEntry {
  id: string;
  previous_name: string;
  new_name: string;
  previous_date: string;
  new_date: string;
  changed_by: string;
  changed_at: string;
  summary?: string;
}

export interface PersistedBranding {
  edition_id: string;
  carnival_name: string;
  carnival_date: string;
  church_name: string;
  service_title: string;
  motto?: string;
  church_logo_url: string | null;
  service_logo_url?: string | null;
  carnival_logo_url: string | null;
  footer_text?: string;
  axes: AxisItem[];
  updated_at: string;
  history: CarnivalInfoHistoryEntry[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const BRANDING_FILE = path.join(DATA_DIR, 'edition-branding.json');

const INITIAL_HISTORY: CarnivalInfoHistoryEntry[] = [
  {
    id: 'hist-init-1',
    previous_name: 'كرنفال الأطفال ٢٠٢٧',
    new_name: 'كرنفال Reflection 2027',
    previous_date: '2027-02-04',
    new_date: '2027-02-04',
    changed_by: 'مايكل يسري مسعد (أدمن)',
    changed_at: '2026-11-09 10:00:00',
    summary: 'الاعتماد الأولي لبيانات الصفحة الرئيسية',
  },
];

const DEFAULT_BRANDING: PersistedBranding = {
  edition_id: 'ed-carnival-2027',
  carnival_name: 'كرنفال Reflection 2027',
  carnival_date: '2027-02-04',
  church_name: 'كنيسة السيدة العذراء مريم - بالعصافرة',
  service_title: 'خدمة ابتدائى بنين وبنات مرحله حضانه لسادسه',
  motto: 'المسيح في قلبي، يظهر في حياتي',
  church_logo_url: null,
  service_logo_url: null,
  carnival_logo_url: '/assets/reflection_carnival_logo.jpg',
  footer_text: 'كنيسة السيدة العذراء مريم - بالعصافرة · كرنفال Reflection 2027',
  axes: INITIAL_AXES,
  updated_at: '2026-11-09T11:00:00Z',
  history: INITIAL_HISTORY,
};

async function readBrandingFromDisk(): Promise<PersistedBranding> {
  try {
    const raw = await fs.readFile(BRANDING_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedBranding>;
    const normalizedServiceTitle =
      !parsed.service_title ||
      parsed.service_title === 'خدمة ابتدائي من حضانة لسادسة بنين وبنات'
        ? DEFAULT_BRANDING.service_title
        : parsed.service_title;

    const normalizedAxes =
      Array.isArray(parsed.axes) && parsed.axes.length > 0
        ? parsed.axes.map((ax) =>
            ax.id === 'axis-psych' && ax.name === 'سلوكي ونفسي'
              ? { ...ax, name: 'سلوكي' }
              : ax
          )
        : DEFAULT_BRANDING.axes;

    return {
      ...DEFAULT_BRANDING,
      ...parsed,
      service_title: normalizedServiceTitle,
      axes: normalizedAxes,
      history:
        Array.isArray(parsed.history) && parsed.history.length > 0
          ? parsed.history
          : DEFAULT_BRANDING.history,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

async function writeBrandingToDisk(data: PersistedBranding): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(BRANDING_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  const branding = await readBrandingFromDisk();
  return NextResponse.json(branding);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PersistedBranding> & {
      changed_by?: string;
      change_summary?: string;
    };
    const current = await readBrandingFromDisk();

    const nextName =
      typeof body.carnival_name === 'string' && body.carnival_name.trim()
        ? body.carnival_name.trim()
        : current.carnival_name;
    const nextDate =
      typeof body.carnival_date === 'string' && body.carnival_date.trim()
        ? body.carnival_date.trim()
        : current.carnival_date;
    const nextChurchName =
      typeof body.church_name === 'string' && body.church_name.trim()
        ? body.church_name.trim()
        : current.church_name;
    const nextServiceTitle =
      typeof body.service_title === 'string' && body.service_title.trim()
        ? body.service_title.trim()
        : current.service_title;
    const nextMotto =
      typeof body.motto === 'string' && body.motto.trim()
        ? body.motto.trim()
        : current.motto || DEFAULT_BRANDING.motto;
    const nextAxes =
      Array.isArray(body.axes) && body.axes.length > 0 ? body.axes : current.axes;

    const nextFooterText =
      typeof body.footer_text === 'string' && body.footer_text.trim()
        ? body.footer_text.trim()
        : `${nextChurchName} · ${nextName}`;

    const hasAnyChange =
      nextName !== current.carnival_name ||
      nextDate !== current.carnival_date ||
      nextChurchName !== current.church_name ||
      nextServiceTitle !== current.service_title ||
      nextMotto !== current.motto ||
      nextFooterText !== current.footer_text ||
      body.church_logo_url !== undefined ||
      body.service_logo_url !== undefined ||
      body.carnival_logo_url !== undefined ||
      JSON.stringify(nextAxes) !== JSON.stringify(current.axes);

    const updatedHistory = [...current.history];
    if (hasAnyChange) {
      updatedHistory.unshift({
        id: `hist-${Date.now()}`,
        previous_name: current.carnival_name,
        new_name: nextName,
        previous_date: current.carnival_date,
        new_date: nextDate,
        changed_by: body.changed_by || 'أدمن الكرنفال',
        changed_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        summary:
          body.change_summary ||
          `تحديث بيانات الصفحة الرئيسية والشريط السفلي (${nextChurchName} - ${nextName})`,
      });
    }

    const updated: PersistedBranding = {
      edition_id: body.edition_id ?? current.edition_id,
      carnival_name: nextName,
      carnival_date: nextDate,
      church_name: nextChurchName,
      service_title: nextServiceTitle,
      motto: nextMotto,
      footer_text: nextFooterText,
      church_logo_url:
        body.church_logo_url !== undefined ? body.church_logo_url : current.church_logo_url,
      service_logo_url:
        body.service_logo_url !== undefined ? body.service_logo_url : current.service_logo_url,
      carnival_logo_url:
        body.carnival_logo_url !== undefined
          ? body.carnival_logo_url
          : current.carnival_logo_url,
      axes: nextAxes,
      updated_at: new Date().toISOString(),
      history: updatedHistory,
    };

    await writeBrandingToDisk(updated);
    return NextResponse.json({ ok: true, branding: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to save branding' },
      { status: 500 }
    );
  }
}
