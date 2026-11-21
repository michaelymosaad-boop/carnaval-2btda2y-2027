'use client';

import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  QrCode,
  Search,
  CheckSquare,
  Square,
  Users,
  UserCheck,
  Scissors,
  Loader2,
  Phone,
  LayoutGrid,
} from 'lucide-react';
import {
  encodeCarnivalQrPayload,
  getTeamAccentHex,
  ROLE_METADATA,
  type CodedGradeItem,
  type CodedTeamItem,
  type Edition,
  type KidParticipant,
  type Servant,
  type ServantRoleRecord,
  type ServiceItem,
} from '@/lib/carnival-store';

interface BulkBadgesPrintManagerProps {
  edition: Edition;
  services: ServiceItem[];
  servants: Servant[];
  servantRoles: ServantRoleRecord[];
  kids: KidParticipant[];
  codedGrades: CodedGradeItem[];
  codedTeams: CodedTeamItem[];
  isLight: boolean;
}

interface PrintableBadgeItem {
  id: string;
  kind: 'kid' | 'servant';
  fullName: string;
  serviceId: string;
  serviceName: string;
  subtitle: string;
  teamName: string;
  accentHex: string;
  pinCode: string;
  qrToken: string;
  qrPayload: string;
  emergencyPhone?: string;
}

export const BulkBadgesPrintManager: React.FC<BulkBadgesPrintManagerProps> = ({
  edition,
  services,
  servants,
  servantRoles,
  kids,
  codedGrades,
  codedTeams,
  isLight,
}) => {
  const [audienceFilter, setAudienceFilter] = useState<'kids' | 'servants' | 'all'>('kids');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [badgesPerPage, setBadgesPerPage] = useState<8 | 6>(8);
  const [showEmergencyPhone, setShowEmergencyPhone] = useState(true);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGeneratingQrs, setIsGeneratingQrs] = useState(false);

  const serviceNameMap = useMemo(
    () => new Map(services.map((s) => [s.id, s.name])),
    [services]
  );

  const teamColorMap = useMemo(() => {
    const map = new Map<string, string>();
    codedTeams.forEach((team, idx) => {
      map.set(team.name, getTeamAccentHex(team.color_label, idx));
    });
    return map;
  }, [codedTeams]);

  const allFilteredItems = useMemo<PrintableBadgeItem[]>(() => {
    const list: PrintableBadgeItem[] = [];
    const q = searchQuery.trim().toLowerCase();

    if (audienceFilter === 'kids' || audienceFilter === 'all') {
      for (const kid of kids) {
        if (serviceFilter !== 'all' && kid.service_id !== serviceFilter) continue;
        if (teamFilter !== 'all' && kid.team_name !== teamFilter) continue;
        if (gradeFilter !== 'all' && kid.grade_label !== gradeFilter) continue;
        if (
          q &&
          !kid.full_name.toLowerCase().includes(q) &&
          !kid.pin_code.toLowerCase().includes(q) &&
          !kid.qr_token.toLowerCase().includes(q)
        ) {
          continue;
        }
        const teamName = kid.team_name || 'بدون فريق';
        list.push({
          id: `kid-${kid.id}`,
          kind: 'kid',
          fullName: kid.full_name,
          serviceId: kid.service_id,
          serviceName: serviceNameMap.get(kid.service_id) || 'خدمة الكرنفال',
          subtitle: kid.grade_label || 'مخدوم مشارك',
          teamName,
          accentHex: teamColorMap.get(kid.team_name) || '#EA580C',
          pinCode: kid.pin_code,
          qrToken: kid.qr_token,
          qrPayload: encodeCarnivalQrPayload({
            type: 'kid',
            code: kid.qr_token,
            pin: kid.pin_code,
            name: kid.full_name,
            service: serviceNameMap.get(kid.service_id) || '',
            phone: kid.parent_phone,
          }),
          emergencyPhone: kid.parent_phone,
        });
      }
    }

    if (audienceFilter === 'servants' || audienceFilter === 'all') {
      for (const s of servants) {
        if (serviceFilter !== 'all' && s.service_id !== serviceFilter) continue;
        if (
          q &&
          !s.full_name.toLowerCase().includes(q) &&
          !(s.pin_code || '').toLowerCase().includes(q) &&
          !(s.qr_token || '').toLowerCase().includes(q)
        ) {
          continue;
        }
        const roleLabels = servantRoles
          .filter((r) => r.servant_id === s.id)
          .map((r) => ROLE_METADATA[r.role]?.label || r.role);
        const roleText =
          roleLabels.length > 0
            ? roleLabels.slice(0, 2).join(' · ')
            : s.primary_role === 'staff'
            ? 'خادم فريق عمل'
            : 'خادم فريق';

        list.push({
          id: `srv-${s.id}`,
          kind: 'servant',
          fullName: s.full_name,
          serviceId: s.service_id,
          serviceName: serviceNameMap.get(s.service_id) || 'خدمة الكرنفال',
          subtitle: roleText,
          teamName: s.primary_role === 'staff' ? 'فريق عمل وتنظيم' : 'خادم مشارك',
          accentHex: s.primary_role === 'staff' ? '#0284C7' : '#059669',
          pinCode: s.pin_code || s.qr_token.slice(-6),
          qrToken: s.qr_token,
          qrPayload: encodeCarnivalQrPayload({
            type: 'servant',
            code: s.qr_token,
            pin: s.pin_code,
            name: s.full_name,
            service: serviceNameMap.get(s.service_id) || '',
            phone: s.phone,
            natIdLast4: s.national_id_last4,
          }),
          emergencyPhone: s.phone,
        });
      }
    }

    return list;
  }, [
    audienceFilter,
    kids,
    servants,
    servantRoles,
    serviceFilter,
    teamFilter,
    gradeFilter,
    searchQuery,
    serviceNameMap,
    teamColorMap,
  ]);

  const selectedItems = useMemo(
    () => allFilteredItems.filter((item) => !excludedIds.includes(item.id)),
    [allFilteredItems, excludedIds]
  );

  // توليد رموز QR للبطاقات المحددة (حتى 120 بطاقة في الدفعة لضمان سرعة الأداء على الموبايل)
  const itemsSignature = useMemo(
    () => selectedItems.map((i) => `${i.id}:${i.qrToken}`).join('|'),
    [selectedItems]
  );

  useEffect(() => {
    let cancelled = false;
    const missingItems = selectedItems.filter((item) => !qrDataUrls[item.id]);
    if (missingItems.length === 0) return;

    const generateAll = async () => {
      setIsGeneratingQrs(true);
      const nextMap: Record<string, string> = {};
      for (const item of missingItems) {
        if (cancelled) return;
        try {
          nextMap[item.id] = await QRCode.toDataURL(item.qrPayload, {
            width: 240,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#0F172A', light: '#FFFFFF' },
          });
        } catch {
          // تجاهل أي خطأ فردي دون إيقاف الباقي
        }
      }
      if (!cancelled && Object.keys(nextMap).length > 0) {
        setQrDataUrls((prev) => ({ ...prev, ...nextMap }));
      }
      if (!cancelled) {
        setIsGeneratingQrs(false);
      }
    };

    generateAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature]);

  const toggleItemSelection = (id: string) => {
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIdSet = new Set(allFilteredItems.map((i) => i.id));
    setExcludedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
  };

  const deselectAllFiltered = () => {
    setExcludedIds((prev) =>
      Array.from(new Set([...prev, ...allFilteredItems.map((i) => i.id)]))
    );
  };

  const pagesCount = Math.ceil(selectedItems.length / badgesPerPage);

  const pages = useMemo(() => {
    const chunks: PrintableBadgeItem[][] = [];
    for (let i = 0; i < selectedItems.length; i += badgesPerPage) {
      chunks.push(selectedItems.slice(i, i + badgesPerPage));
    }
    return chunks;
  }, [selectedItems, badgesPerPage]);

  const mutedText = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div dir="rtl" className="space-y-4">
      {/* لوحة الفلاتر وخيارات الطباعة — مخفية تلقائياً عند الطباعة */}
      <div className="space-y-3 print:hidden">
        {/* نوع البطاقات */}
        <div
          className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0C1222] border-slate-800'
          }`}
        >
          {(
            [
              { id: 'kids', label: `المخدومين (${kids.length})`, icon: Users },
              { id: 'servants', label: `الخدام (${servants.length})`, icon: UserCheck },
              { id: 'all', label: `الكل (${kids.length + servants.length})`, icon: QrCode },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const active = audienceFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAudienceFilter(opt.id)}
                className={`min-h-[40px] px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  active
                    ? 'bg-gradient-to-l from-orange-600 to-amber-500 text-white shadow-xs'
                    : isLight
                    ? 'text-slate-700 hover:bg-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* الفلاتر التفصيلية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            aria-label="تصفية حسب الخدمة"
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#121B2E] border-slate-700 text-slate-100'
            }`}
          >
            <option value="all">كل الخدمات ({services.length})</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {audienceFilter !== 'servants' && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              aria-label="تصفية حسب الفريق"
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#121B2E] border-slate-700 text-slate-100'
              }`}
            >
              <option value="all">كل الفرق ({codedTeams.length})</option>
              {codedTeams.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {audienceFilter !== 'servants' && (
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              aria-label="تصفية حسب السنة الدراسية"
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#121B2E] border-slate-700 text-slate-100'
              }`}
            >
              <option value="all">كل السنوات الدراسية</option>
              {codedGrades.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className={`w-full min-h-[40px] pr-8 pl-3 rounded-xl border text-xs font-bold outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#121B2E] border-slate-700 text-slate-100'
              }`}
            />
          </div>
        </div>

        {/* خيارات التخطيط والتحديد */}
        <div
          className={`rounded-2xl p-3 border flex flex-wrap items-center justify-between gap-2.5 text-xs ${
            isLight
              ? 'bg-amber-50/70 border-amber-200 text-slate-900'
              : 'bg-[#121B2E] border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold flex items-center gap-1">
              <LayoutGrid className="w-3.5 h-3.5 text-orange-500" />
              <span>التخطيط:</span>
            </span>
            <button
              type="button"
              onClick={() => setBadgesPerPage(8)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold cursor-pointer ${
                badgesPerPage === 8
                  ? 'bg-orange-600 text-white border-orange-600'
                  : isLight
                  ? 'bg-white border-slate-300 text-slate-700'
                  : 'bg-[#0C1222] border-slate-700 text-slate-300'
              }`}
            >
              ٨ بادجات / A4 (قياسي)
            </button>
            <button
              type="button"
              onClick={() => setBadgesPerPage(6)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold cursor-pointer ${
                badgesPerPage === 6
                  ? 'bg-orange-600 text-white border-orange-600'
                  : isLight
                  ? 'bg-white border-slate-300 text-slate-700'
                  : 'bg-[#0C1222] border-slate-700 text-slate-300'
              }`}
            >
              ٦ بادجات / A4 (كبير)
            </button>
          </div>

          <label className="flex items-center gap-1.5 font-bold cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={showEmergencyPhone}
              onChange={(e) => setShowEmergencyPhone(e.target.checked)}
              className="w-4 h-4 accent-orange-600 rounded"
            />
            <span>إظهار هاتف الطوارئ على البادج</span>
          </label>
        </div>

        {/* شريط التحديد وزر الطباعة الرئيسي */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold">
            <button
              type="button"
              onClick={selectAllFiltered}
              className={`min-h-[36px] px-2.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-[#121B2E] border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>تحديد الكل ({allFilteredItems.length})</span>
            </button>
            <button
              type="button"
              onClick={deselectAllFiltered}
              className={`min-h-[36px] px-2.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-[#121B2E] border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>إلغاء الكل</span>
            </button>
          </div>

          <button
            type="button"
            disabled={selectedItems.length === 0 || isGeneratingQrs}
            onClick={() => window.print()}
            className="min-h-[44px] px-4 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            {isGeneratingQrs ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تجهيز رموز QR...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>
                  طباعة / حفظ PDF ({selectedItems.length} بادج · {pagesCount} صفحة A4)
                </span>
              </>
            )}
          </button>
        </div>

        {/* قائمة الاختيار السريع للبطاقات */}
        {allFilteredItems.length > 0 && (
          <div
            className={`rounded-2xl p-2.5 border max-h-40 overflow-y-auto space-y-1 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1222] border-slate-800'
            }`}
          >
            <div className={`text-[10px] font-extrabold px-1 pb-1 ${mutedText}`}>
              اضغط على أي اسم لاستبعاده أو إضافته للطباعة:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allFilteredItems.map((item) => {
                const isSelected = !excludedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItemSelection(item.id)}
                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-400 line-through'
                        : 'bg-[#121B2E] border-slate-800 text-slate-500 line-through'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.accentHex }}
                    />
                    <span className="max-w-[140px] truncate">{item.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* معاينة وصفحات الطباعة الفعلية A4 جاهزة للقص */}
      {selectedItems.length === 0 ? (
        <div
          className={`p-8 rounded-2xl border border-dashed text-center space-y-2 print:hidden ${
            isLight
              ? 'bg-slate-50 border-slate-300 text-slate-600'
              : 'bg-[#0C1222] border-slate-700 text-slate-400'
          }`}
        >
          <QrCode className="w-8 h-8 mx-auto opacity-50" />
          <div className="text-xs font-extrabold">لا توجد بطاقات محددة للطباعة حالياً</div>
          <p className="text-[11px] opacity-80">
            سجّل المخدومين أو الخدام أولاً أو عدّل الفلاتر بالأعلى لتظهر بطاقات الـ QR الجاهزة للقص.
          </p>
        </div>
      ) : (
        <div className="space-y-4 print:space-y-0">
          <div
            className={`flex items-center justify-between text-[11px] font-extrabold px-1 print:hidden ${mutedText}`}
          >
            <span className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-orange-500" />
              <span>معاينة أوراق A4 بعلامات القص المتقطعة ({pagesCount} صفحة):</span>
            </span>
            <span>مقاس موحّد للقص والتغليف</span>
          </div>

          {pages.map((pageItems, pageIdx) => (
            <div
              key={pageIdx}
              className={`rounded-2xl border p-3 bg-white text-slate-900 shadow-sm print:shadow-none print:border-0 print:rounded-none print:p-0 ${
                pageIdx < pages.length - 1 ? 'print:break-after-page' : ''
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-2 mb-2 border-b border-slate-200 print:mb-1.5 print:pb-1">
                <span>
                  {edition.name} · {edition.church_name}
                </span>
                <span>
                  صفحة {pageIdx + 1} من {pagesCount} ({pageItems.length} بطاقة)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2.5 print:gap-2">
                {pageItems.map((badge) => (
                  <div
                    key={badge.id}
                    className={`rounded-2xl border-2 border-dashed border-slate-400 bg-white overflow-hidden break-inside-avoid flex flex-col justify-between ${
                      badgesPerPage === 6 ? 'min-h-[210px]' : 'min-h-[168px]'
                    }`}
                  >
                    {/* الشريط العلوي بلون الفريق */}
                    <div
                      className="px-3 py-1.5 text-white flex items-center justify-between gap-2"
                      style={{ backgroundColor: badge.accentHex }}
                    >
                      <span className="text-[10px] font-black truncate">{edition.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-extrabold shrink-0">
                        {badge.teamName}
                      </span>
                    </div>

                    {/* جسم البطاقة: البيانات + QR */}
                    <div className="p-2.5 flex items-center justify-between gap-2.5 flex-1">
                      <div className="min-w-0 flex-1 space-y-1 text-right">
                        <div className="text-[10px] font-bold text-slate-500 truncate">
                          {badge.serviceName}
                        </div>
                        <div className="text-sm font-black text-slate-900 leading-tight line-clamp-2">
                          {badge.fullName}
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-600 truncate">
                          {badge.subtitle}
                        </div>

                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            dir="ltr"
                            className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono text-[10px] font-black text-slate-900"
                          >
                            PIN: {badge.pinCode}
                          </span>
                        </div>

                        {showEmergencyPhone && badge.emergencyPhone && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 pt-0.5">
                            <Phone className="w-2.5 h-2.5 shrink-0 text-slate-500" />
                            <span dir="ltr" className="font-mono">
                              {badge.emergencyPhone}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        <div className="w-[84px] h-[84px] rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center">
                          {qrDataUrls[badge.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={qrDataUrls[badge.id]}
                              alt={`QR ${badge.fullName}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <QrCode className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <span
                          dir="ltr"
                          className="text-[8px] font-mono font-bold text-slate-500 max-w-[86px] truncate"
                        >
                          {badge.qrToken}
                        </span>
                      </div>
                    </div>

                    {/* فوتر البطاقة */}
                    <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-500">
                      <span className="truncate">{edition.church_name}</span>
                      <span className="shrink-0">{badge.kind === 'kid' ? 'بطاقة مخدوم' : 'بطاقة خادم'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
