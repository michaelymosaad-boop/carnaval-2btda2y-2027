-- ============================================================================
-- Migration: 0001_foundation_and_auth.sql
-- Project: تطبيق كرنفال الأطفال (السبت 30 يناير 2027)
-- Description: المرحلة 1 و 2 - الدورات، الخدمات، المحاور، الخدام، الأدوار،
--              أكواد الدخول المجزأة، سجل النقاط والمراجعة (Append-Only)، وسياسات RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. جدول الدورات (editions) شاملاً بيانات الهوية واللوجوهات المتغيرة لكل دورة
CREATE TABLE IF NOT EXISTS public.editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  church_name TEXT NOT NULL DEFAULT 'كنيسة السيدة العذراء مريم - بالعصافرة',
  service_title TEXT NOT NULL DEFAULT 'خدمة ابتدائي من حضانة لسادسة بنين وبنات',
  church_logo_url TEXT,
  carnival_logo_url TEXT DEFAULT '/assets/reflection_carnival_logo.jpg',
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  current_stage SMALLINT NOT NULL DEFAULT 2 CHECK (current_stage BETWEEN 1 AND 7),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;

-- 2. جدول الخدمات الخمس (services)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_group TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 3. جدول محاور الكرنفال (axes)
CREATE TABLE IF NOT EXISTS public.axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'sparkles',
  sort_order SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.axes ENABLE ROW LEVEL SECURITY;

-- 4. جدول الخدام (servants)
-- ملاحظة أمنية: qr_token منفصل تماماً عن كود الدخول، والرقم القومي يُحفظ مجزّأً (hash) مع آخر 4 أرقام فقط
CREATE TABLE IF NOT EXISTS public.servants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  national_id_hash TEXT NOT NULL,
  national_id_last4 CHAR(4) NOT NULL,
  health_and_skills JSONB NOT NULL DEFAULT '{"skills": [], "health_notes": ""}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disabled')),
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edition_id, national_id_hash),
  UNIQUE (edition_id, email)
);

ALTER TABLE public.servants ENABLE ROW LEVEL SECURITY;

-- 5. جدول أدوار الخدام (servant_roles) - الخادم الواحد يمكن أن يجمع أكثر من دور
CREATE TABLE IF NOT EXISTS public.servant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servant_id UUID NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'service_lead', 'registrar', 'team_lead', 'staff', 'emergency')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (servant_id, role)
);

ALTER TABLE public.servant_roles ENABLE ROW LEVEL SECURITY;

-- 6. جدول أكواد الدخول السرية (login_codes) - الكود مجزّأ وليس نصاً صريحاً
CREATE TABLE IF NOT EXISTS public.login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servant_id UUID NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'whatsapp_sent')),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

-- 7. جدول طلبات استرجاع الكود (recovery_requests)
CREATE TABLE IF NOT EXISTS public.recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  servant_id UUID REFERENCES public.servants(id) ON DELETE SET NULL,
  national_id_last4 CHAR(4) NOT NULL,
  phone TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent_email', 'pending_whatsapp', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_requests ENABLE ROW LEVEL SECURITY;

-- 8. جدول الفرق (teams)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  lead_servant_id UUID REFERENCES public.servants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 9. جدول المخدومين / الأطفال (kids) - بدون رقم قومي ولا عنوان نهائياً
CREATE TABLE IF NOT EXISTS public.kids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  guardian_phone TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  short_code TEXT NOT NULL UNIQUE,
  is_team_leader BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.servants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kids ENABLE ROW LEVEL SECURITY;

-- 10. جدول حضور الفعاليات (attendance) مع قيد منع التكرار UNIQUE(person_id, event_id)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('kid', 'servant')),
  event_id UUID NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('qr', 'manual', 'offline')),
  policy_version_id UUID,
  tier_id UUID,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.servants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, event_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 11. سجل النقاط غير قابل للتعديل (points_ledger - APPEND ONLY)
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('kid', 'team', 'servant')),
  subject_id UUID NOT NULL,
  axis_id UUID REFERENCES public.axes(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('attendance', 'bonus', 'participation', 'game', 'engagement', 'correction')),
  event_id UUID,
  round_id UUID,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.servants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

-- 12. سجل المراجعة غير قابل للتعديل (audit_log - APPEND ONLY)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES public.editions(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- حظر التعديل أو الحذف (Append-Only Enforcement Triggers)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_update_or_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'الجدول (%) للإضافة فقط (Append-Only). يُمنع التعديل أو الحذف نهائياً؛ استخدم قيداً تصحيحياً جديداً.', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_points_ledger_append_only ON public.points_ledger;
CREATE TRIGGER trg_points_ledger_append_only
BEFORE UPDATE OR DELETE ON public.points_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_update_or_delete();

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON public.audit_log;
CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_update_or_delete();

-- ============================================================================
-- سياسات أمان الصفوف (Row Level Security Policies)
-- ============================================================================

-- القراءة العامة لبيانات الدورة النشطة والخدمات والمحاور (للواجهة وتسجيل الخدام)
CREATE POLICY "editions_read_active" ON public.editions
  FOR SELECT USING (true);

CREATE POLICY "services_read_all" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "axes_read_all" ON public.axes
  FOR SELECT USING (true);

-- سياسة جدول الخدام: الخادم يرى نفسه، ومسؤول الخدمة يرى خدام خدمته فقط، والأدمن يرى الكل
CREATE POLICY "servants_select_by_role" ON public.servants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.servants me
      JOIN public.servant_roles sr ON sr.servant_id = me.id
      WHERE me.user_id = auth.uid()
        AND me.status = 'approved'
        AND (
          sr.role = 'admin'
          OR (sr.role = 'service_lead' AND me.service_id = public.servants.service_id)
        )
    )
  );

-- سياسة إضافة النقاط وسجل المراجعة: الإضافة فقط للمصرح لهم، ولا توجد سياسة UPDATE أو DELETE
CREATE POLICY "points_ledger_insert_authorized" ON public.points_ledger
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.servants me
      JOIN public.servant_roles sr ON sr.servant_id = me.id
      WHERE me.user_id = auth.uid()
        AND me.status = 'approved'
        AND sr.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "audit_log_insert_all" ON public.audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_log_select_admin_only" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.servants me
      JOIN public.servant_roles sr ON sr.servant_id = me.id
      WHERE me.user_id = auth.uid()
        AND me.status = 'approved'
        AND sr.role = 'admin'
    )
  );
