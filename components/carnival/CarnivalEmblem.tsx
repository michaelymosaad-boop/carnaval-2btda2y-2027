'use client';

import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Upload,
  Church,
  CheckCircle2,
  Loader2,
  Calendar,
  Edit3,
  History,
  BookOpen,
  HeartHandshake,
  Palette,
  Laptop,
  Lock,
  X,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Plus,
  Users,
} from 'lucide-react';
import {
  INITIAL_AXES,
  compressImageFileToDataUrl,
  formatArabicDateLabel,
  type AxisItem,
  type CarnivalInfoHistoryEntry,
  type Edition,
} from '@/lib/carnival-store';

export interface HomepageAdminPayload {
  church_name: string;
  service_title: string;
  carnival_name: string;
  carnival_date: string;
  motto?: string;
  footer_text?: string;
  church_logo_url: string | null;
  service_logo_url?: string | null;
  carnival_logo_url: string | null;
  axes: AxisItem[];
  changed_by: string;
}

interface CarnivalEmblemProps {
  edition: Edition;
  axes: AxisItem[];
  history: CarnivalInfoHistoryEntry[];
  isLight: boolean;
  isSavingLogo: boolean;
  lastSavedTarget: 'church' | 'service' | 'carnival' | null;
  isAdminAuthorized: boolean;
  externalAdminPanelOpen?: boolean;
  onCloseExternalAdminPanel?: () => void;
  hideLoginSubheader?: boolean;
  onLogoUpload: (
    target: 'church' | 'service' | 'carnival',
    dataUrl: string | null
  ) => Promise<void>;
  onSaveHomepageSettings: (payload: HomepageAdminPayload) => Promise<void>;
}

function getDimensionIcon(axisId: string) {
  switch (axisId) {
    case 'axis-spiritual':
      return <BookOpen className="w-3.5 h-3.5 shrink-0" />;
    case 'axis-psych':
      return <HeartHandshake className="w-3.5 h-3.5 shrink-0" />;
    case 'axis-creative':
      return <Palette className="w-3.5 h-3.5 shrink-0" />;
    case 'axis-tech':
      return <Laptop className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
  }
}

export const CarnivalEmblem: React.FC<CarnivalEmblemProps> = ({
  edition,
  axes,
  history,
  isLight,
  isSavingLogo,
  lastSavedTarget,
  isAdminAuthorized,
  externalAdminPanelOpen,
  onCloseExternalAdminPanel,
  hideLoginSubheader = false,
  onLogoUpload,
  onSaveHomepageSettings,
}) => {
  const churchInputRef = useRef<HTMLInputElement | null>(null);
  const serviceInputRef = useRef<HTMLInputElement | null>(null);
  const carnivalInputRef = useRef<HTMLInputElement | null>(null);
  const [carnivalImgError, setCarnivalImgError] = useState(false);

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'edit' | 'history'>('edit');

  const [draftChurchName, setDraftChurchName] = useState(edition.church_name);
  const [draftServiceTitle, setDraftServiceTitle] = useState(edition.service_title);
  const [draftCarnivalName, setDraftCarnivalName] = useState(edition.name);
  const [draftCarnivalDate, setDraftCarnivalDate] = useState(edition.starts_on);
  const [draftMotto, setDraftMotto] = useState(
    edition.motto || 'المسيح في قلبي، يظهر في حياتي'
  );
  const [draftFooterText, setDraftFooterText] = useState(
    edition.footer_text || `${edition.church_name} · ${edition.name}`
  );
  const [draftChurchLogo, setDraftChurchLogo] = useState<string | null>(edition.church_logo_url);
  const [draftServiceLogo, setDraftServiceLogo] = useState<string | null>(
    edition.service_logo_url || null
  );
  const [draftCarnivalLogo, setDraftCarnivalLogo] = useState<string | null>(
    edition.carnival_logo_url
  );
  const [draftAxes, setDraftAxes] = useState<AxisItem[]>(axes.length > 0 ? axes : INITIAL_AXES);

  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const isModalOpen = isAdminAuthorized && (internalModalOpen || !!externalAdminPanelOpen);

  const closeAdminModal = () => {
    setInternalModalOpen(false);
    if (onCloseExternalAdminPanel) {
      onCloseExternalAdminPanel();
    }
  };

  const openAdminModal = (tab: 'edit' | 'history') => {
    if (!isAdminAuthorized) return;
    setDraftChurchName(edition.church_name);
    setDraftServiceTitle(edition.service_title);
    setDraftCarnivalName(edition.name);
    setDraftCarnivalDate(edition.starts_on);
    setDraftMotto(edition.motto || 'المسيح في قلبي، يظهر في حياتي');
    setDraftFooterText(edition.footer_text || `${edition.church_name} · ${edition.name}`);
    setDraftChurchLogo(edition.church_logo_url);
    setDraftServiceLogo(edition.service_logo_url || null);
    setDraftCarnivalLogo(edition.carnival_logo_url);
    setDraftAxes(axes.length > 0 ? axes : INITIAL_AXES);
    setModalError(null);
    setModalSuccess(null);
    setModalTab(tab);
    setInternalModalOpen(true);
  };

  const handleDraftLogoFile = async (
    target: 'church' | 'service' | 'carnival',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, 512);
      if (target === 'church') {
        setDraftChurchLogo(compressedDataUrl);
      } else if (target === 'service') {
        setDraftServiceLogo(compressedDataUrl);
      } else {
        setCarnivalImgError(false);
        setDraftCarnivalLogo(compressedDataUrl);
      }
      await onLogoUpload(target, compressedDataUrl);
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async (target: 'church' | 'service' | 'carnival') => {
    if (target === 'church') {
      setDraftChurchLogo(null);
      await onLogoUpload('church', null);
    } else if (target === 'service') {
      setDraftServiceLogo(null);
      await onLogoUpload('service', null);
    } else {
      setDraftCarnivalLogo(null);
      await onLogoUpload('carnival', null);
    }
  };

  const handleRestoreDefaultCarnivalLogo = async () => {
    const defaultLogo = '/assets/reflection_carnival_logo.jpg';
    setCarnivalImgError(false);
    setDraftCarnivalLogo(defaultLogo);
    await onLogoUpload('carnival', defaultLogo);
  };

  const handleAxisChange = (index: number, field: 'name' | 'color', value: string) => {
    setDraftAxes((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddAxis = () => {
    if (draftAxes.length >= 6) return;
    setDraftAxes((prev) => [
      ...prev,
      {
        id: `axis-custom-${prev.length + 1}`,
        edition_id: edition.id,
        name: 'جانب جديد',
        color: '#EA580C',
        text_class: 'text-orange-600',
        dot_class: 'bg-orange-500',
        sort_order: prev.length + 1,
      },
    ]);
  };

  const handleRemoveAxis = (index: number) => {
    if (draftAxes.length <= 1) return;
    setDraftAxes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const cleanChurch = draftChurchName.trim();
    const cleanService = draftServiceTitle.trim();
    const cleanCarnival = draftCarnivalName.trim();
    const cleanDate = draftCarnivalDate.trim();
    const cleanMotto = draftMotto.trim() || 'المسيح في قلبي، يظهر في حياتي';
    const cleanedAxes = draftAxes
      .map((a) => ({ ...a, name: a.name.trim() }))
      .filter((a) => a.name.length > 0);

    if (!cleanChurch || !cleanService || !cleanCarnival) {
      setModalError('يرجى التأكد من ملء اسم الكنيسة، اسم الخدمة، واسم الكرنفال.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      setModalError('يرجى اختيار تاريخ صحيح لميعاد الكرنفال.');
      return;
    }
    if (cleanedAxes.length === 0) {
      setModalError('يرجى الإبقاء على جانب واحد على الأقل من الجوانب الأربعة.');
      return;
    }

    const actorName = 'مايكل يسري مسعد (أدمن)';
    if (!isAdminAuthorized) {
      setModalError('يلزم توثيق الأدمن بحساب Google المعتمد لحفظ تعديلات الصفحة الرئيسية.');
      return;
    }

    const cleanFooter = draftFooterText.trim() || `${cleanChurch} · ${cleanCarnival}`;

    setIsSavingInfo(true);
    await onSaveHomepageSettings({
      church_name: cleanChurch,
      service_title: cleanService,
      carnival_name: cleanCarnival,
      carnival_date: cleanDate,
      motto: cleanMotto,
      footer_text: cleanFooter,
      church_logo_url: draftChurchLogo,
      service_logo_url: draftServiceLogo,
      carnival_logo_url: draftCarnivalLogo,
      axes: cleanedAxes,
      changed_by: actorName,
    });
    setIsSavingInfo(false);
    setModalSuccess(
      'تم حفظ جميع تعديلات الصفحة الرئيسية والشريط السفلي وتوثيقها في السجل.'
    );
  };

  return (
    <div className="space-y-3">
      {/* مدخلات رفع اللوجوهات المخفية */}
      <input
        ref={churchInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleDraftLogoFile('church', e)}
        className="hidden"
      />
      <input
        ref={serviceInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleDraftLogoFile('service', e)}
        className="hidden"
      />
      <input
        ref={carnivalInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleDraftLogoFile('carnival', e)}
        className="hidden"
      />

      {/* ١. الهيدر العلوي المتوازي بنظام CSS Grid: لوجو الكنيسة على اليمين | بالمنتصف دباجة الكنيسة وتحتها بالمحاذاة اسم الخدمة وتحتها اسم الكرنفال والعام | على اليسار موازٍ لوجو الخدمة */}
      <div
        className={`rounded-3xl p-2.5 sm:p-3.5 border-2 transition-all ${
          isLight
            ? 'bg-white border-amber-200/90 shadow-md shadow-amber-500/5'
            : 'bg-[#12192B]/95 border-slate-800 shadow-xl'
        }`}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3.5">
          {/* اليمين من فوق: لوجو الكنيسة */}
          <div className="flex flex-col items-center shrink-0">
            <div
              onClick={isAdminAuthorized ? () => openAdminModal('edit') : undefined}
              title={
                isAdminAuthorized
                  ? 'لوجو الكنيسة (اضغط لفتح لوحة التعديل)'
                  : 'لوجو الكنيسة'
              }
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all ${
                isAdminAuthorized ? 'cursor-pointer' : 'cursor-default'
              } ${
                isLight
                  ? 'bg-amber-50/80 border-amber-300 text-amber-800'
                  : 'bg-slate-900 border-amber-500/40 text-amber-300'
              }`}
            >
              {edition.church_logo_url ? (
                <img
                  src={edition.church_logo_url}
                  alt="لوجو الكنيسة"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1 bg-white"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-1 text-center">
                  <Church className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 stroke-[2]" />
                  <span className="mt-0.5 text-[8px] sm:text-[9px] font-extrabold leading-tight">
                    لوجو الكنيسة
                  </span>
                </div>
              )}
            </div>
            {lastSavedTarget === 'church' && (
              <span className="mt-0.5 text-[9px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>تم الحفظ</span>
              </span>
            )}
          </div>

          {/* المنتصف بين اللوجوهين بالمحاذاة: ١. دباجة الكنيسة -> ٢. تحتها اسم الخدمة -> ٣. تحتها اسم الكرنفال والعام */}
          <div className="flex-1 text-center min-w-0 flex flex-col items-center justify-center space-y-1 py-0.5">
            <h2
              className={`w-full text-xs sm:text-sm font-extrabold tracking-wide leading-snug break-words ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {edition.church_name}
            </h2>

            <p
              className={`w-full text-[11px] sm:text-xs font-extrabold tracking-wide leading-snug break-words ${
                isLight ? 'text-orange-700' : 'text-amber-400'
              }`}
            >
              {edition.service_title}
            </p>

            <div
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full border text-[11px] sm:text-xs font-extrabold tracking-wide max-w-full ${
                isLight
                  ? 'bg-amber-50/90 border-amber-200 text-blue-700'
                  : 'bg-[#172036] border-slate-700 text-sky-300'
              }`}
            >
              <span className="whitespace-normal text-center">{edition.name}</span>
            </div>

            {isSavingLogo && (
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>جاري الحفظ...</span>
              </div>
            )}
          </div>

          {/* اليسار موازٍ للوجو الكنيسة: لوجو الخدمة */}
          <div className="flex flex-col items-center shrink-0">
            <div
              onClick={isAdminAuthorized ? () => openAdminModal('edit') : undefined}
              title={
                isAdminAuthorized
                  ? 'لوجو الخدمة (اضغط لفتح لوحة التعديل)'
                  : 'لوجو الخدمة'
              }
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 overflow-hidden flex items-center justify-center shadow-2xs transition-all ${
                isAdminAuthorized ? 'cursor-pointer' : 'cursor-default'
              } ${
                isLight
                  ? 'bg-sky-50/70 border-sky-300 text-blue-800'
                  : 'bg-slate-900 border-sky-500/40 text-sky-300'
              }`}
            >
              {edition.service_logo_url ? (
                <img
                  src={edition.service_logo_url}
                  alt="لوجو الخدمة"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1 bg-white"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-1 text-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 stroke-[2]" />
                  <span className="mt-0.5 text-[8px] sm:text-[9px] font-extrabold leading-tight">
                    لوجو الخدمة
                  </span>
                </div>
              )}
            </div>
            {lastSavedTarget === 'service' && (
              <span className="mt-0.5 text-[9px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>تم الحفظ</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ٢. العنوان الفرعي + الجوانب الأربعة (يظهر في شاشة الدخول أو عند عدم إخفائه) */}
      {!hideLoginSubheader && (
        <div className="text-center space-y-2 pt-0.5">
          {axes.length > 0 && (
            <div
              className="grid gap-1.5 sm:gap-2 w-full max-w-md mx-auto"
              style={{
                gridTemplateColumns: `repeat(${Math.min(axes.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {axes.map((axis) => (
                <div
                  key={axis.id}
                  className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-xl border text-[11px] font-extrabold ${
                    isLight
                      ? 'bg-white/95 border-amber-200/90 shadow-2xs'
                      : 'bg-[#12192B] border-slate-800'
                  }`}
                  style={{ color: axis.color }}
                >
                  {getDimensionIcon(axis.id)}
                  <span className="truncate">{axis.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ٣. لوحة أدمن الصفحة الرئيسية */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4">
          <div
            className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 p-4 sm:p-6 shadow-2xl space-y-4 ${
              isLight
                ? 'bg-white border-amber-200 text-slate-900'
                : 'bg-[#111829] border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-500/20">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold">
                    لوحة أدمن الصفحة الرئيسية والشريط السفلي
                  </h3>
                  <p className="text-[11px] opacity-75">
                    تعديل لوجو الكنيسة، لوجو الخدمة، لوجو الكرنفال، الأسماء، والشعار
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAdminModal}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-500/10">
              <button
                type="button"
                onClick={() => setModalTab('edit')}
                className={`min-h-[36px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  modalTab === 'edit'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل عناصر الصفحة</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('history')}
                className={`min-h-[36px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  modalTab === 'history'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل التعديلات ({history.length})</span>
              </button>
            </div>

            {modalError && (
              <div className="rounded-2xl p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="rounded-2xl p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {modalTab === 'edit' ? (
              <form onSubmit={handleSaveAllSettings} className="space-y-4">
                {/* ١. إدارة اللوجوهات الثلاثة */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* لوجو الكنيسة (يمين) */}
                  <div
                    className={`rounded-2xl p-3 border space-y-2 ${
                      isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold">١. لوجو الكنيسة (يمين)</div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {draftChurchLogo ? (
                          <img
                            src={draftChurchLogo}
                            alt="لوجو الكنيسة"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Church className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => churchInputRef.current?.click()}
                          className="min-h-[28px] px-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>رفع</span>
                        </button>
                        {draftChurchLogo && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLogo('church')}
                            className="min-h-[26px] px-2 rounded-lg bg-red-500/15 text-red-600 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* لوجو الخدمة (شمال) */}
                  <div
                    className={`rounded-2xl p-3 border space-y-2 ${
                      isLight ? 'bg-sky-50/50 border-sky-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold">٢. لوجو الخدمة (يسار)</div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {draftServiceLogo ? (
                          <img
                            src={draftServiceLogo}
                            alt="لوجو الخدمة"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => serviceInputRef.current?.click()}
                          className="min-h-[28px] px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>رفع</span>
                        </button>
                        {draftServiceLogo && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLogo('service')}
                            className="min-h-[26px] px-2 rounded-lg bg-red-500/15 text-red-600 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* لوجو الكرنفال (منتصف صفحة الاستقبال) */}
                  <div
                    className={`rounded-2xl p-3 border space-y-2 ${
                      isLight ? 'bg-orange-50/50 border-orange-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold">٣. لوجو الكرنفال (المنتصف)</div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {draftCarnivalLogo && !carnivalImgError ? (
                          <img
                            src={draftCarnivalLogo}
                            alt="لوجو الكرنفال"
                            onError={() => setCarnivalImgError(true)}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <Sparkles className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => carnivalInputRef.current?.click()}
                          className="min-h-[28px] px-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>رفع</span>
                        </button>
                        {draftCarnivalLogo ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteLogo('carnival')}
                            className="min-h-[26px] px-2 rounded-lg bg-red-500/15 text-red-600 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRestoreDefaultCarnivalLogo}
                            className="min-h-[26px] px-2 rounded-lg bg-emerald-500/15 text-emerald-600 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>افتراضي</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ٢. دباجة الكنيسة واسم الخدمة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      دباجة الكنيسة (أعلى المنتصف):
                    </label>
                    <input
                      type="text"
                      required
                      value={draftChurchName}
                      onChange={(e) => setDraftChurchName(e.target.value)}
                      className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                          : 'bg-[#0C1220] border-slate-700 text-white focus:border-orange-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      اسم الخدمة (تحت دباجة الكنيسة):
                    </label>
                    <input
                      type="text"
                      required
                      value={draftServiceTitle}
                      onChange={(e) => setDraftServiceTitle(e.target.value)}
                      className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                          : 'bg-[#0C1220] border-slate-700 text-white focus:border-orange-500'
                      }`}
                    />
                  </div>
                </div>

                {/* ٣. اسم الكرنفال والعام + الميعاد */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      اسم الكرنفال والعام:
                    </label>
                    <input
                      type="text"
                      required
                      value={draftCarnivalName}
                      onChange={(e) => setDraftCarnivalName(e.target.value)}
                      className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                          : 'bg-[#0C1220] border-slate-700 text-white focus:border-orange-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      ميعاد الكرنفال:
                    </label>
                    <input
                      type="date"
                      dir="ltr"
                      required
                      value={draftCarnivalDate}
                      onChange={(e) => setDraftCarnivalDate(e.target.value)}
                      className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold font-[family-name:var(--font-mono)] outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                          : 'bg-[#0C1220] border-slate-700 text-white focus:border-orange-500'
                      }`}
                    />
                  </div>
                </div>

                {/* ٤. دباجة شعار الكرنفال + نص الشريط السفلي */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      شعار الكرنفال تحت اللوجو:
                    </label>
                    <input
                      type="text"
                      value={draftMotto}
                      onChange={(e) => setDraftMotto(e.target.value)}
                      className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                          : 'bg-[#0C1220] border-slate-700 text-white focus:border-orange-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      نص الشريط السفلي المثبت (Footer):
                    </label>
                    <input
                      type="text"
                      value={draftFooterText}
                      onChange={(e) => setDraftFooterText(e.target.value)}
                      className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                          : 'bg-[#0C1220] border-slate-700 text-white focus:border-orange-500'
                      }`}
                    />
                  </div>
                </div>

                {/* ٥. الجوانب الأربعة */}
                <div
                  className={`rounded-2xl p-3 border space-y-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1220] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">الجوانب الأربعة:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddAxis}
                        className="min-h-[26px] px-2 rounded-lg bg-blue-600/15 text-blue-600 dark:text-sky-400 border border-blue-500/30 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>إضافة جانب</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftAxes(INITIAL_AXES)}
                        className="min-h-[26px] px-2 rounded-lg bg-slate-500/10 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>الافتراضي</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {draftAxes.map((ax, idx) => (
                      <div
                        key={ax.id}
                        className={`flex items-center gap-1.5 p-1.5 rounded-xl border ${
                          isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                        }`}
                      >
                        <input
                          type="color"
                          value={ax.color}
                          onChange={(e) => handleAxisChange(idx, 'color', e.target.value)}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer shrink-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={ax.name}
                          onChange={(e) => handleAxisChange(idx, 'name', e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 text-xs font-extrabold bg-transparent outline-none"
                        />
                        {draftAxes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAxis(idx)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* تأكيد الحفظ */}

                <button
                  type="submit"
                  disabled={isSavingInfo}
                  className="w-full min-h-[44px] rounded-2xl bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingInfo ? 'جاري الحفظ...' : 'حفظ جميع تعديلات الصفحة الرئيسية'}
                </button>
              </form>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-2xl p-3 border text-xs space-y-1 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-orange-600 dark:text-amber-400">
                        {entry.changed_by}
                      </span>
                      <span
                        dir="ltr"
                        className="font-[family-name:var(--font-mono)] text-[11px] opacity-65 tabular-nums"
                      >
                        {entry.changed_at}
                      </span>
                    </div>
                    {entry.summary && (
                      <div className="text-[11px] font-bold opacity-85">{entry.summary}</div>
                    )}
                    <div>
                      <span className="opacity-70">الاسم: </span>
                      <span className="line-through opacity-60">{entry.previous_name}</span>
                      <span className="mx-1.5 font-bold">←</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {entry.new_name}
                      </span>
                    </div>
                    <div>
                      <span className="opacity-70">الميعاد: </span>
                      <span dir="ltr" className="font-[family-name:var(--font-mono)] opacity-60">
                        {entry.previous_date}
                      </span>
                      <span className="mx-1.5 font-bold">←</span>
                      <span
                        dir="ltr"
                        className="font-[family-name:var(--font-mono)] font-extrabold text-blue-600 dark:text-sky-400"
                      >
                        {entry.new_date}
                      </span>{' '}
                      <span>({formatArabicDateLabel(entry.new_date)})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
