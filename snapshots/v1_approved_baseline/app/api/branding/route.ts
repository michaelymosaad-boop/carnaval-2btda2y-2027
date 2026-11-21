import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface PersistedBranding {
  edition_id: string;
  church_name: string;
  service_title: string;
  church_logo_url: string | null;
  carnival_logo_url: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const BRANDING_FILE = path.join(DATA_DIR, 'edition-branding.json');

const DEFAULT_BRANDING: PersistedBranding = {
  edition_id: 'ed-carnival-2027',
  church_name: 'كنيسة السيدة العذراء مريم - بالعصافرة',
  service_title: 'خدمة ابتدائي من حضانة لسادسة بنين وبنات',
  church_logo_url: null,
  carnival_logo_url: '/assets/reflection_carnival_logo.jpg',
  updated_at: '2026-11-09T11:00:00Z',
};

async function readBrandingFromDisk(): Promise<PersistedBranding> {
  try {
    const raw = await fs.readFile(BRANDING_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedBranding>;
    return {
      ...DEFAULT_BRANDING,
      ...parsed,
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
    const body = (await req.json()) as Partial<PersistedBranding>;
    const current = await readBrandingFromDisk();

    const updated: PersistedBranding = {
      edition_id: body.edition_id ?? current.edition_id,
      church_name: body.church_name ?? current.church_name,
      service_title: body.service_title ?? current.service_title,
      church_logo_url:
        body.church_logo_url !== undefined ? body.church_logo_url : current.church_logo_url,
      carnival_logo_url:
        body.carnival_logo_url !== undefined && body.carnival_logo_url !== null
          ? body.carnival_logo_url
          : current.carnival_logo_url,
      updated_at: new Date().toISOString(),
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
