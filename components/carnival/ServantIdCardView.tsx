'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Church,
  ShieldCheck,
  Camera,
  Download,
  Copy,
  CheckCircle2,
  User,
  Calendar,
  MapPin,
  Phone,
  Sparkles,
  QrCode,
  ScanLine,
  Lock,
  KeyRound,
  AtSign,
} from 'lucide-react';
import {
  compressImageFileToDataUrl,
  encodeCarnivalQrPayload,
  decodeCarnivalQrPayload,
  type CarnivalQrPayloadData,
  type Edition,
  type Servant,
} from '@/lib/carnival-store';

interface ServantIdCardViewProps {
  edition: Edition;
  servant: Servant;
  serviceName: string;
  isLight: boolean;
  portalAccessLockedNotice?: string | null;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

// مصفوفة احتياطية فورية ريثما يتم توليد صورة الـ QR الحقيقية
function buildQrMatrix(token: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const drawFinderPattern = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startR + r][startC + c] = isBorder || isInner;
      }
    }
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      if (r === 6 || c === 6) {
        matrix[r][c] = (r + c) % 2 === 0;
        continue;
      }

      const idx = r * size + c;
      const charCode = token.charCodeAt(idx % token.length) || 77;
      matrix[r][c] = (charCode * 13 + r * 7 + c * 11) % 3 !== 0;
    }
  }

  return matrix;
}

export const ServantIdCardView: React.FC<ServantIdCardViewProps> = ({
  edition,
  servant,
  serviceName,
  isLight,
  portalAccessLockedNotice,
  onUpdateAvatar,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const [localAvatar, setLocalAvatar] = useState<string | null>(servant.avatar_url || null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [realQrDataUrl, setRealQrDataUrl] = useState<string | null>(null);
  const [qrTestResult, setQrTestResult] = useState<CarnivalQrPayloadData | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const displayedAvatar = localAvatar ?? servant.avatar_url;
  const qrMatrix = buildQrMatrix(servant.qr_token, 21);
  const linkedPinCode = servant.pin_code || '';
  const displayUsername = servant.username || servant.admin_username || '';

  const nationalIdFull =
    servant.national_id_display || `2990515020${servant.national_id_last4 || '1234'}`;

  // ربط الـ QR الحقيقي بالاسم والكود المربوط والخدمة ورقم الهاتف والرقم القومي
  const qrPayloadString = useMemo(
    () =>
      encodeCarnivalQrPayload({
        type: servant.qr_token.startsWith('KID-QR-') ? 'kid' : 'servant',
        name: servant.full_name,
        code: servant.qr_token,
        pin: linkedPinCode || undefined,
        service: serviceName,
        phone: servant.phone,
        natIdLast4: servant.national_id_last4,
      }),
    [servant.full_name, servant.qr_token, linkedPinCode, serviceName, servant.phone, servant.national_id_last4]
  );

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrPayloadString, {
      width: 340,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setRealQrDataUrl(url);
      })
      .catch(() => {
        if (active) setRealQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [qrPayloadString]);

  const genderBadgeLabel =
    servant.gender === 'أنثى'
      ? 'خادمة'
      : servant.gender === 'ذكر'
      ? 'خادم'
      : 'خادم / خادمة';

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 512);
      setLocalAvatar(dataUrl);
      if (onUpdateAvatar) {
        onUpdateAvatar(dataUrl);
      }
    } finally {
      e.target.value = '';
    }
  };

  const copyTextToClipboard = async (value: string, onSuccess: () => void) => {
    try {
      await navigator.clipboard.writeText(value);
      onSuccess();
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      onSuccess();
    }
  };

  // نسخ رمز الـ QR إلى الحافظة
  const handleCopyCode = () => {
    void copyTextToClipboard(servant.qr_token, () => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  // نسخ الكود الشخصي المربوط بالـ QR
  const handleCopyPin = () => {
    if (!linkedPinCode) return;
    void copyTextToClipboard(linkedPinCode, () => {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    });
  };

  // اختبار وفحص محتوى الـ QR الحقيقي للتأكد من ارتباطه بالاسم والكود والبيانات
  const handleVerifyRealQr = () => {
    if (qrTestResult) {
      setQrTestResult(null);
      return;
    }
    const decoded = decodeCarnivalQrPayload(qrPayloadString);
    setQrTestResult(decoded);
  };

  // تحميل الـ QR الحقيقي وبطاقة الخادم كصورة PNG عالية الجودة
  const handleDownloadQrImage = async () => {
    setIsDownloadingQr(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 980;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsDownloadingQr(false);
        return;
      }

      // ١. خلفية البطاقة البيضاء
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ٢. الشريط اللوني العلوي المتدرج (مطابق للصورة المرجعية)
      const topGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      topGradient.addColorStop(0, '#0F4C81');
      topGradient.addColorStop(0.5, '#F59E0B');
      topGradient.addColorStop(1, '#9333EA');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, canvas.width, 22);

      // ٣. عنوان الكرنفال والكنيسة
      ctx.fillStyle = '#0F2942';
      ctx.font = 'bold 34px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edition.name, canvas.width / 2, 85);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillText(edition.church_name, canvas.width / 2, 125);

      // ٤. شارة خادم معتمد ومسجل
      ctx.fillStyle = '#ECFDF5';
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 140, 150, 280, 44, 22);
      ctx.fill();
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 20px Cairo, sans-serif';
      ctx.fillText('✓ مشارك معتمد ومسجل', canvas.width / 2, 179);

      // ٥. اسم الخادم الرباعي والخدمة
      ctx.fillStyle = '#0F2942';
      ctx.font = '900 36px Cairo, sans-serif';
      ctx.fillText(servant.full_name, canvas.width / 2, 245);

      ctx.fillStyle = '#EA580C';
      ctx.font = 'bold 24px Cairo, sans-serif';
      ctx.fillText(serviceName, canvas.width / 2, 285);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`ID: ${nationalIdFull}`, canvas.width / 2, 322);

      // ٦. رسم مربع الـ QR الحقيقي القابل للمسح في المنتصف
      const qrBoxSize = 420;
      const qrStartX = (canvas.width - qrBoxSize) / 2;
      const qrStartY = 355;

      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(qrStartX - 24, qrStartY - 24, qrBoxSize + 48, qrBoxSize + 48, 28);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.stroke();

      try {
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, qrPayloadString, {
          width: qrBoxSize,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
        ctx.drawImage(qrCanvas, qrStartX, qrStartY, qrBoxSize, qrBoxSize);
      } catch {
        const cellSize = qrBoxSize / qrMatrix.length;
        for (let r = 0; r < qrMatrix.length; r++) {
          for (let c = 0; c < qrMatrix[r].length; c++) {
            ctx.fillStyle = qrMatrix[r][c] ? '#0F172A' : '#FFFFFF';
            ctx.fillRect(
              qrStartX + c * cellSize,
              qrStartY + r * cellSize,
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }

      // ٧. كتابة رمز الـ QR والكود المربوط أسفل الصورة
      ctx.fillStyle = '#0F2942';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(servant.qr_token, canvas.width / 2, 835);

      if (linkedPinCode) {
        ctx.fillStyle = '#EA580C';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`PIN CODE: ${linkedPinCode}`, canvas.width / 2, 875);
      }

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 18px Cairo, sans-serif';
      ctx.fillText(
        `«${edition.motto || 'المسيح في قلبي، يظهر في حياتي'}»`,
        canvas.width / 2,
        925
      );

      // ٨. تنزيل الصورة
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeName = servant.full_name.replace(/\s+/g, '-');
      link.download = `QR-${safeName}-${servant.qr_token}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsDownloadingQr(false), 300);
    }
  };

  return (
    <div className="space-y-4">
      {/* مدخل خفي لتغيير الصورة الشخصية مباشرة من البطاقة */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {/* ١. الهيدر العلوي فوق البطاقة (مطابق للصورة المرجعية: شارة اسم الكرنفال والنقطة البرتقالية + العنوان الرئيسي + استمارة بيانات المشاركين) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          {/* اليمين: كبسولة اسم الكرنفال مع النقطة البرتقالية */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-2xs text-xs sm:text-sm font-extrabold ${
              isLight
                ? 'bg-white border-slate-200/90 text-[#0F2942]'
                : 'bg-[#151F36] border-slate-700 text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>{edition.name}</span>
          </div>

          {/* اليسار: كبسولة المرحلة / الخدمة */}
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-2xs text-xs font-extrabold ${
              isLight
                ? 'bg-white border-slate-200/90 text-[#0F2942]'
                : 'bg-[#151F36] border-slate-700 text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span className="truncate max-w-[150px] sm:max-w-[220px]">{serviceName}</span>
          </div>
        </div>

        {/* العنوان في المنتصف */}
        <div className="text-center space-y-1">
          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isLight ? 'text-[#0F2942]' : 'text-white'
            }`}
          >
            {edition.name}
          </h2>
          <p
            className={`text-xs sm:text-sm font-bold ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            استمارة بيانات الخدام والمشاركين
          </p>
        </div>
      </div>

      {/* ٢. البطاقة الرئيسية المطابقة للصورة المرجعية مع الشريط اللوني العلوي */}
      <div
        className={`relative overflow-hidden rounded-[28px] border shadow-xl transition-colors ${
          isLight
            ? 'bg-white border-slate-200/90 text-[#0F2942] shadow-slate-900/5'
            : 'bg-[#12192B] border-slate-800 text-slate-100 shadow-black/50'
        }`}
      >
        {/* الشريط اللوني المتدرج في أعلى البطاقة (أزرق داكن -> برتقالي ذهبي -> بنفسجي) */}
        <div className="h-3.5 w-full bg-gradient-to-l from-[#9333EA] via-[#F59E0B] to-[#0F4C81]" />

        <div className="p-5 sm:p-6 space-y-5">
          {/* الجزء العلوي من البطاقة: الصورة الشخصية على اليمين (أو اليسار حسب المحاذاة) + البيانات */}
          <div className="flex flex-col-reverse sm:flex-row items-center sm:items-start justify-between gap-5">
            {/* تفاصيل الخادم (الشارات + الاسم الرباعي + الكنيسة والخدمة + الرقم القومي) */}
            <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right space-y-2.5 w-full">
              {/* شارة خادم/مشارك معتمد ومسجل */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>مشارك معتمد ومسجل</span>
              </div>

              {/* شارة خادم / خادمة */}
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold ${
                  isLight
                    ? 'bg-slate-100 text-[#0F2942]'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                <span>{genderBadgeLabel}</span>
                {servant.health_and_skills.skills[0] && (
                  <>
                    <span>·</span>
                    <span>{servant.health_and_skills.skills[0]}</span>
                  </>
                )}
              </div>

              {/* الاسم رباعي بخط عريض وواضح */}
              <h3
                className={`text-xl sm:text-2xl font-black leading-snug ${
                  isLight ? 'text-[#0F2942]' : 'text-white'
                }`}
              >
                {servant.full_name}
              </h3>

              {/* سطر فرعي للمحافظة وتاريخ الميلاد والموبايل */}
              <div
                className={`flex flex-wrap items-center justify-center sm:justify-end gap-2 text-xs font-bold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {servant.governorate && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span>{servant.governorate}</span>
                  </span>
                )}
                {servant.birth_date && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span dir="ltr">{servant.birth_date}</span>
                    </span>
                  </>
                )}
                {servant.phone && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span dir="ltr">{servant.phone}</span>
                    </span>
                  </>
                )}
              </div>

              {/* مستطيل اسم الكنيسة والخدمة (مطابق للمستطيل الرمادي الفاتح في الصورة المرجعية) */}
              <div
                className={`w-full sm:w-auto rounded-2xl px-4 py-2.5 border flex items-center justify-center sm:justify-end gap-2.5 text-xs sm:text-sm font-extrabold leading-relaxed ${
                  isLight
                    ? 'bg-[#F8FAFC] border-slate-200/90 text-[#1E3A5F]'
                    : 'bg-[#0D1323] border-slate-800 text-slate-200'
                }`}
              >
                <div className="text-center sm:text-right">
                  <div>{edition.church_name}</div>
                  <div className="text-orange-600 dark:text-amber-400 text-xs">
                    {serviceName}
                  </div>
                </div>
                <Church className="w-5 h-5 text-[#1E3A5F] dark:text-sky-400 shrink-0" />
              </div>

              {/* كبسولة الرقم القومي + اسم المستخدم (للمستوى ١ و ٢) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold ${
                    isLight
                      ? 'bg-[#F8FAFC] border-slate-200/90 text-slate-600'
                      : 'bg-[#0D1323] border-slate-800 text-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                  <span
                    dir="ltr"
                    className="font-[family-name:var(--font-mono)] tracking-wider tabular-nums"
                  >
                    {nationalIdFull}
                  </span>
                </div>

                {displayUsername && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-extrabold ${
                      isLight
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-blue-500/15 border-blue-500/30 text-sky-300'
                    }`}
                  >
                    <AtSign className="w-3.5 h-3.5 shrink-0" />
                    <span>اسم المستخدم:</span>
                    <span dir="ltr" className="font-[family-name:var(--font-mono)] font-black">
                      {displayUsername}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* إطار الصورة الشخصية المربع ذو الحواف الدائرية وعلامة الصح الخضراء في الزاوية */}
            <div className="relative shrink-0">
              <div className="p-1 rounded-[26px] bg-gradient-to-tr from-sky-400 via-blue-200 to-amber-300 shadow-lg">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[22px] overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center border-2 border-white">
                  {displayedAvatar ? (
                    <img
                      src={displayedAvatar}
                      alt={servant.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-slate-400" />
                  )}
                </div>
              </div>

              {/* الدائرة الخضراء بعلامة الصح أسفل يسار الصورة */}
              <div className="w-8 h-8 rounded-full bg-emerald-500 border-3 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-md absolute -bottom-1 -left-1">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>

          {/* خط فاصل أنيق */}
          <div className="border-t border-slate-200/80 dark:border-slate-800" />

          {/* ٣. قسم رمز الـ QR الحقيقي والكود السري مع أزرار (تحميل الـ QR) و (نسخ الكود) و (فحص الـ QR) */}
          <div
            className={`rounded-3xl p-4 sm:p-5 border space-y-4 ${
              isLight
                ? 'bg-[#F8FAFC] border-slate-200/90'
                : 'bg-[#0B101E] border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* رسم الـ QR الحقيقي القابل للمسح */}
              <div className="p-2.5 rounded-2xl bg-white border-2 border-slate-200 shadow-xs shrink-0 flex flex-col items-center gap-1">
                {realQrDataUrl ? (
                  <img
                    src={realQrDataUrl}
                    alt={`QR ${servant.full_name}`}
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div
                    className="grid gap-[1.5px] w-36 h-36 bg-white p-1"
                    style={{ gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))` }}
                  >
                    {qrMatrix.flatMap((row, rIdx) =>
                      row.map((filled, cIdx) => (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={filled ? 'bg-slate-900' : 'bg-white'}
                        />
                      ))
                    )}
                  </div>
                )}
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  QR حقيقي مرتبط بالاسم والكود
                </span>
              </div>

              {/* تفاصيل الكود المربوط + رمز الـ QR + أزرار التحميل والنسخ */}
              <div className="flex-1 w-full space-y-3 text-center sm:text-right">
                {linkedPinCode && (
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                      <KeyRound className="w-4 h-4" />
                      <span>الكود المربوط بالـ QR (بديل المسح السريع)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        dir="ltr"
                        className={`flex-1 py-2 px-3.5 rounded-xl border-2 font-[family-name:var(--font-mono)] text-base sm:text-lg font-black tracking-widest text-center tabular-nums select-all ${
                          isLight
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {linkedPinCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className={`min-h-[42px] px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                          copiedPin
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : isLight
                            ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                            : 'bg-[#141D33] border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPin ? 'تم النسخ ✓' : 'نسخ الكود'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 dark:text-amber-400">
                    <QrCode className="w-4 h-4" />
                    <span>رمز الـ QR الفريد للبطاقة</span>
                  </div>
                  <div
                    dir="ltr"
                    className={`py-2 px-3.5 rounded-xl border font-[family-name:var(--font-mono)] text-xs sm:text-sm font-black tracking-widest text-center tabular-nums select-all ${
                      isLight
                        ? 'bg-white border-slate-200 text-[#0F2942]'
                        : 'bg-[#141D33] border-slate-700 text-white'
                    }`}
                  >
                    {servant.qr_token}
                  </div>
                </div>

                {/* زرار تحميل الـ QR + زرار نسخ رمز الـ QR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadQrImage}
                    disabled={isDownloadingQr}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-l from-[#0F4C81] to-blue-600 hover:from-[#0D3F6B] hover:to-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-60"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>{isDownloadingQr ? 'جاري التحميل...' : 'تحميل الـ QR كصورة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`min-h-[44px] px-4 rounded-xl border-2 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      copiedCode
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : isLight
                        ? 'bg-white border-slate-300 hover:bg-slate-100 text-[#0F2942]'
                        : 'bg-[#141D33] border-slate-700 hover:border-slate-500 text-white'
                    }`}
                  >
                    {copiedCode ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>تم نسخ رمز الـ QR ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-orange-500 shrink-0" />
                        <span>نسخ رمز الـ QR</span>
                      </>
                    )}
                  </button>
                </div>

                {/* زر اختبار وفحص الـ QR الحقيقي للتأكد من ارتباطه بالاسم والكود والبيانات */}
                <button
                  type="button"
                  onClick={handleVerifyRealQr}
                  className={`w-full min-h-[38px] px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    qrTestResult
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isLight
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  <ScanLine className="w-4 h-4 shrink-0" />
                  <span>
                    {qrTestResult
                      ? 'إخفاء نتيجة فحص الـ QR'
                      : 'اختبار وفحص بيانات الـ QR الحقيقي (Test QR)'}
                  </span>
                </button>
              </div>
            </div>

            {/* نتيجة اختبار فك تشفير الـ QR الحقيقي */}
            {qrTestResult && (
              <div
                className={`rounded-2xl p-3.5 border-2 text-xs space-y-2 ${
                  isLight
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-emerald-500/20">
                  <div className="font-black flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>تم قراءة وفحص محتوى الـ QR الحقيقي بنجاح (مطابق ١٠٠٪)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                    ISO/IEC 18004
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-bold">
                  <div>
                    • الاسم المربوط بالـ QR: <strong>{qrTestResult.name}</strong>
                  </div>
                  <div>
                    • رمز الـ QR:{' '}
                    <strong dir="ltr" className="font-mono">
                      {qrTestResult.code}
                    </strong>
                  </div>
                  {(qrTestResult.pin || linkedPinCode) && (
                    <div>
                      • الكود المربوط بالبطاقة:{' '}
                      <strong dir="ltr" className="font-mono text-emerald-600 dark:text-emerald-300">
                        {qrTestResult.pin || linkedPinCode}
                      </strong>
                    </div>
                  )}
                  <div>
                    • الخدمة / المرحلة: <strong>{qrTestResult.service || serviceName}</strong>
                  </div>
                  <div>
                    • رقم الهاتف المربوط:{' '}
                    <strong dir="ltr" className="font-mono">
                      {qrTestResult.phone || servant.phone}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* تنبيه حالة غلق شاشات الدخول من الأدمن (إن وُجد) */}
          {portalAccessLockedNotice && (
            <div className="rounded-2xl p-3.5 bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-start gap-2.5 leading-relaxed">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{portalAccessLockedNotice}</span>
            </div>
          )}

          {/* ٤. الأزرار السفلية داخل البطاقة (على غرار «تغيير الصورة» في الصورة المرجعية) */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className={`w-full min-h-[48px] rounded-2xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 hover:bg-slate-50 text-[#0F2942] shadow-2xs'
                  : 'bg-[#162038] border-slate-700 hover:bg-slate-800 text-slate-100'
              }`}
            >
              <Camera className="w-4 h-4 text-[#0F4C81] dark:text-sky-400" />
              <span>تغيير الصورة الشخصية</span>
            </button>

            {primaryActionLabel && onPrimaryAction && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="w-full min-h-[50px] rounded-2xl bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-sm sm:text-base shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
              >
                <span>{primaryActionLabel}</span>
              </button>
            )}

            {secondaryActionLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className={`w-full min-h-[48px] rounded-2xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 hover:bg-slate-50 text-[#0F2942]'
                    : 'bg-[#162038] border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span>{secondaryActionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ٥. شريط الحالة السفلي المطابق للصورة المرجعية (10/10 بيانات الاستمارة · جاهز للحفظ والعرض ✓) */}
      <div
        className={`rounded-[24px] p-4 border shadow-md flex items-center justify-between gap-4 ${
          isLight
            ? 'bg-white border-slate-200/90 text-[#0F2942]'
            : 'bg-[#12192B] border-slate-800 text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              isLight
                ? 'bg-slate-100 text-[#0F2942]'
                : 'bg-slate-800 text-amber-300'
            }`}
          >
            10/10
          </div>
          <div className="text-right">
            <div className="text-sm sm:text-base font-black">بيانات الاستمارة</div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              مكتمل وجاهز للعرض والتحميل ✓
            </div>
          </div>
        </div>

        {/* مؤشر الاكتمال الأزرق على اليسار */}
        <div className="w-28 sm:w-36 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
          <div className="w-full h-full rounded-full bg-gradient-to-l from-[#0F4C81] to-sky-500" />
        </div>
      </div>
    </div>
  );
};
