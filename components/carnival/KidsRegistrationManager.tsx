'use client';

import React, { useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Copy,
  Check,
  QrCode,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Sparkles,
  ClipboardPaste,
  Lock,
  ScanLine,
  Images,
  Share2,
} from 'lucide-react';
import {
  INITIAL_CODED_GRADES,
  INITIAL_CODED_TEAMS,
  createRecordId,
  generateRandomCode,
  getReadableNow,
  encodeCarnivalQrPayload,
  decodeCarnivalQrPayload,
  type CarnivalQrPayloadData,
  type CodedGradeItem,
  type CodedTeamItem,
  type Edition,
  type KidParticipant,
  type ServiceItem,
} from '@/lib/carnival-store';

interface KidsRegistrationManagerProps {
  edition: Edition;
  services: ServiceItem[];
  kids: KidParticipant[];
  codedGrades?: CodedGradeItem[];
  codedTeams?: CodedTeamItem[];
  actorName: string;
  actorServiceId: string;
  isAdmin: boolean;
  canAddKids?: boolean;
  canViewKidsCodes?: boolean;
  isKidsRegistrationOpen?: boolean;
  isLight: boolean;
  onAddKids: (newKids: KidParticipant[]) => void;
  onDeleteKid?: (kidId: string) => void;
}

interface ParsedKidRow {
  full_name: string;
  grade_label: string;
  parent_phone: string;
  team_name: string;
  health_notes: string;
}

function buildKidQrMatrix(seed: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isInner;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      matrix[r][c] = (Math.abs(hash) + r + c) % 2 === 0;
    }
  }
  return matrix;
}

export const KidsRegistrationManager: React.FC<KidsRegistrationManagerProps> = ({
  edition,
  services,
  kids,
  codedGrades = INITIAL_CODED_GRADES,
  codedTeams = INITIAL_CODED_TEAMS,
  actorName,
  actorServiceId,
  isAdmin,
  canAddKids = true,
  canViewKidsCodes = false,
  isKidsRegistrationOpen = true,
  isLight,
  onAddKids,
  onDeleteKid,
}) => {
  const hasCodesAccess = isAdmin || canViewKidsCodes;
  const hasAddAccess = isAdmin || canAddKids;
  const canRegisterNow = isAdmin || (hasAddAccess && isKidsRegistrationOpen);

  const [subMode, setSubMode] = useState<'manual' | 'excel' | 'list'>(
    !hasAddAccess && hasCodesAccess ? 'list' : 'manual'
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    actorServiceId || services[0]?.id || 'srv-boys-4-6'
  );

  // حقول الإدخال الفردي (مرتبطة مباشرة بقوائم التكويد List of Values)
  const [fullName, setFullName] = useState('');
  const [gradeLabel, setGradeLabel] = useState(
    codedGrades[0]?.name || 'الصف الرابع الابتدائي'
  );
  const [parentPhone, setParentPhone] = useState('');
  const [teamName, setTeamName] = useState(
    codedTeams[0]?.name || 'فريق أسود الكرنفال (المجموعة أ)'
  );
  const [healthNotes, setHealthNotes] = useState('');

  // حقول رفع الإكسيل / CSV أو اللصق المباشر
  const [pastedRowsText, setPastedRowsText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedKidRow[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeneratingBatchQr, setIsGeneratingBatchQr] = useState(false);
  const [testedKidQr, setTestedKidQr] = useState<{
    kidId: string;
    decoded: CarnivalQrPayloadData;
    qrDataUrl: string | null;
  } | null>(null);

  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleKids = useMemo(() => {
    const byService = isAdmin
      ? kids.filter((k) => !selectedServiceId || k.service_id === selectedServiceId)
      : kids.filter((k) => k.service_id === actorServiceId);

    if (!searchQuery.trim()) return byService;
    const q = searchQuery.trim().toLowerCase();
    return byService.filter(
      (k) =>
        k.full_name.toLowerCase().includes(q) ||
        k.pin_code.toLowerCase().includes(q) ||
        k.parent_phone.includes(q) ||
        k.team_name.toLowerCase().includes(q)
    );
  }, [kids, isAdmin, selectedServiceId, actorServiceId, searchQuery]);

  const effectiveServiceId = isAdmin ? selectedServiceId : actorServiceId;
  const effectiveServiceName =
    services.find((s) => s.id === effectiveServiceId)?.name || 'المرحلة المحددة';

  // ١. إضافة مخدوم فردياً مع اختيار السنة الدراسية والفريق من قوائم التكويد
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!hasAddAccess) {
      setFeedback({
        type: 'error',
        text: 'صلاحيتك الحالية مقتصرة على عرض وسحب أكواد المخدومين فقط دون الإضافة أو التعديل.',
      });
      return;
    }

    if (!canRegisterNow) {
      setFeedback({
        type: 'error',
        text: 'تسجيل المخدومين مغلق حالياً من قِبل إدارة الكرنفال (الأدمن).',
      });
      return;
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 3) {
      setFeedback({
        type: 'error',
        text: 'يرجى إدخال اسم المخدوم ثلاثياً أو رباعياً بشكل واضح.',
      });
      return;
    }

    const cleanPhone = parentPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFeedback({
        type: 'error',
        text: 'يرجى إدخال رقم هاتف ولي الأمر بشكل صحيح.',
      });
      return;
    }

    const pinCode = 'K' + generateRandomCode(5);
    const qrToken = `KID-QR-${generateRandomCode(8)}`;

    const newKid: KidParticipant = {
      id: createRecordId('kid'),
      edition_id: edition.id,
      full_name: fullName.trim(),
      service_id: effectiveServiceId,
      grade_label: gradeLabel.trim() || codedGrades[0]?.name || 'غير محدد',
      parent_phone: cleanPhone,
      health_notes: healthNotes.trim() || 'لا توجد',
      team_name: teamName.trim() || codedTeams[0]?.name || 'قيد التوزيع',
      pin_code: pinCode,
      qr_token: qrToken,
      registered_by_name: actorName,
      source: 'manual',
      created_at: getReadableNow(16),
    };

    onAddKids([newKid]);
    setFullName('');
    setParentPhone('');
    setHealthNotes('');
    setFeedback({
      type: 'success',
      text: hasCodesAccess
        ? `تم تسجيل المخدوم (${newKid.full_name}) بنجاح وتوليد كود الدخول (${newKid.pin_code}).`
        : `تم تسجيل المخدوم (${newKid.full_name}) بنجاح وحفظ الكود والـ QR في سجل الأكواد لدى الأدمن.`,
    });
  };

  // ٢-أ. تحميل شيت القالب الفارغ المزود بقوائم منسدلة (List of Values) في Excel (.xls SpreadsheetML)
  // هذا القالب يتحدث تلقائياً مع أي تحديث في شاشة تكويد السنة الدراسية وتكويد الفرق!
  const handleDownloadExcelWithDropdowns = () => {
    const gradeListEscaped = codedGrades
      .map((g) => g.name.replace(/"/g, '').replace(/,/g, ' - '))
      .join(',');
    const teamListEscaped = codedTeams
      .map((t) => t.name.replace(/"/g, '').replace(/,/g, ' - '))
      .join(',');

    const sampleGrade1 = codedGrades[0]?.name || 'الصف الرابع الابتدائي';
    const sampleGrade2 = codedGrades[1]?.name || sampleGrade1;
    const sampleTeam1 = codedTeams[0]?.name || 'فريق أسود الكرنفال (المجموعة أ)';
    const sampleTeam2 = codedTeams[1]?.name || sampleTeam1;

    // بناء ٢٠ صفاً فارغاً جاهزاً للاختيار من القوائم المنسدلة داخل Excel
    const emptyRowsXml = Array.from({ length: 20 }, () => {
      return `<Row>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String">${sampleGrade1}</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String">${sampleTeam1}</Data></Cell>
        <Cell><Data ss:Type="String">لا توجد</Data></Cell>
      </Row>`;
    }).join('\n');

    const codingLookupRowsXml = Array.from(
      { length: Math.max(codedGrades.length, codedTeams.length) },
      (_, i) => {
        const g = codedGrades[i];
        const t = codedTeams[i];
        return `<Row>
          <Cell><Data ss:Type="String">${g ? g.code : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${g ? g.name : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${t ? t.code : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${t ? t.name : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${t ? t.color_label : ''}</Data></Cell>
        </Row>`;
      }
    ).join('\n');

    const xmlWorkbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Cairo" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#EA580C" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="تسجيل_المخدومين" ss:RightToLeft="1">
  <Table>
   <Column ss:Width="190"/>
   <Column ss:Width="150"/>
   <Column ss:Width="120"/>
   <Column ss:Width="180"/>
   <Column ss:Width="160"/>
   <Row ss:StyleID="HeaderStyle">
    <Cell><Data ss:Type="String">الاسم رباعي</Data></Cell>
    <Cell><Data ss:Type="String">السنة الدراسية (قائمة منسدلة)</Data></Cell>
    <Cell><Data ss:Type="String">رقم ولي الأمر</Data></Cell>
    <Cell><Data ss:Type="String">اسم الفريق (قائمة منسدلة)</Data></Cell>
    <Cell><Data ss:Type="String">ملاحظات صحية</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">مينا سامح وديع جرجس</Data></Cell>
    <Cell><Data ss:Type="String">${sampleGrade1}</Data></Cell>
    <Cell><Data ss:Type="String">01223344556</Data></Cell>
    <Cell><Data ss:Type="String">${sampleTeam1}</Data></Cell>
    <Cell><Data ss:Type="String">لا توجد</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">كاراس هاني نبيل فؤاد</Data></Cell>
    <Cell><Data ss:Type="String">${sampleGrade2}</Data></Cell>
    <Cell><Data ss:Type="String">01287766554</Data></Cell>
    <Cell><Data ss:Type="String">${sampleTeam2}</Data></Cell>
    <Cell><Data ss:Type="String">حساسية ألبان</Data></Cell>
   </Row>
   ${emptyRowsXml}
  </Table>
  <DataValidation xmlns="urn:schemas-microsoft-com:office:excel">
   <Range>R2C2:R100C2</Range>
   <Type>List</Type>
   <CellRangeList/>
   <Value>&quot;${gradeListEscaped}&quot;</Value>
  </DataValidation>
  <DataValidation xmlns="urn:schemas-microsoft-com:office:excel">
   <Range>R2C4:R100C4</Range>
   <Type>List</Type>
   <CellRangeList/>
   <Value>&quot;${teamListEscaped}&quot;</Value>
  </DataValidation>
 </Worksheet>
 <Worksheet ss:Name="قوائم_التكويد_المحدثة" ss:RightToLeft="1">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="170"/>
   <Column ss:Width="90"/>
   <Column ss:Width="190"/>
   <Column ss:Width="120"/>
   <Row ss:StyleID="HeaderStyle">
    <Cell><Data ss:Type="String">كود السنة</Data></Cell>
    <Cell><Data ss:Type="String">السنة الدراسية المكوّدة</Data></Cell>
    <Cell><Data ss:Type="String">كود الفريق</Data></Cell>
    <Cell><Data ss:Type="String">اسم الفريق المكوّد</Data></Cell>
    <Cell><Data ss:Type="String">لون الفريق</Data></Cell>
   </Row>
   ${codingLookupRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlWorkbook], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `قالب_المخدومين_بقوائم_التكويد_${effectiveServiceName.replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ٢-ب. تحميل قالب CSV خفيف محدث بأحدث قيم التكويد
  const handleDownloadCsvTemplate = () => {
    const g1 = codedGrades[0]?.name || 'الصف الرابع الابتدائي';
    const g2 = codedGrades[1]?.name || g1;
    const t1 = codedTeams[0]?.name || 'فريق أسود الكرنفال (المجموعة أ)';
    const t2 = codedTeams[1]?.name || t1;

    const headers = 'الاسم رباعي,السنة الدراسية,رقم ولي الأمر,اسم الفريق,ملاحظات صحية';
    const sample1 = `مينا سامح وديع جرجس,${g1},01223344556,${t1},لا توجد`;
    const sample2 = `كاراس هاني نبيل فؤاد,${g2},01287766554,${t2},حساسية ألبان`;
    const csvContent = `\uFEFF${headers}\n${sample1}\n${sample2}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `قالب_تسجيل_المخدومين_${effectiveServiceName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ٣. تحليل نص CSV أو TSV أو Excel XML المرفوع أو الملصوق
  const parseSpreadsheetText = (rawText: string) => {
    const rows: ParsedKidRow[] = [];

    // في حال رفع ملف Excel XML (.xls) الذي تم تحميله من القالب
    if (rawText.includes('<Workbook') && rawText.includes('<Row')) {
      const worksheetChunk = rawText.split('قوائم_التكويد_المحدثة')[0] || rawText;
      const rowMatches = worksheetChunk.match(/<Row[^>]*>([\s\S]*?)<\/Row>/g) || [];
      for (let i = 0; i < rowMatches.length; i++) {
        const rowXml = rowMatches[i];
        const cellMatches = Array.from(rowXml.matchAll(/<Data[^>]*>([\s\S]*?)<\/Data>/g)).map(
          (m) => m[1].trim()
        );
        const name = cellMatches[0] || '';
        if (!name || name.includes('الاسم') || name.length < 3) continue;
        rows.push({
          full_name: name,
          grade_label: cellMatches[1] || codedGrades[0]?.name || 'مرحلة ابتدائية',
          parent_phone: (cellMatches[2] || '01200000000').replace(/\D/g, '') || '01200000000',
          team_name: cellMatches[3] || codedTeams[0]?.name || 'قيد التوزيع',
          health_notes: cellMatches[4] || 'لا توجد',
        });
      }
    } else {
      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          i === 0 &&
          (line.includes('الاسم') ||
            line.toLowerCase().includes('name') ||
            line.includes('ولي الأمر'))
        ) {
          continue;
        }

        const separator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
        const cols = line.split(separator).map((c) => c.replace(/^["']|["']$/g, '').trim());

        const name = cols[0] || '';
        if (name.length < 3) continue;

        rows.push({
          full_name: name,
          grade_label: cols[1] || codedGrades[0]?.name || 'مرحلة ابتدائية',
          parent_phone: (cols[2] || '01200000000').replace(/\D/g, '') || '01200000000',
          team_name: cols[3] || codedTeams[0]?.name || 'قيد التوزيع',
          health_notes: cols[4] || 'لا توجد',
        });
      }
    }

    setParsedPreview(rows);
    if (rows.length === 0) {
      setFeedback({
        type: 'error',
        text: 'لم يتم العثور على صفوف صالحة في الملف أو النص. تأكد من كتابة الاسم في العمود الأول.',
      });
    } else {
      setFeedback({
        type: 'success',
        text: `تم قراءة (${rows.length}) مخدوم بنجاح! يمكنك مراجعة السنة الدراسية والفريق من القوائم بالأسفل ثم الضغط على «اعتماد وتسجيل الكل».`,
      });
    }
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    try {
      const text = await file.text();
      setPastedRowsText(text);
      parseSpreadsheetText(text);
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر قراءة الملف. يرجى رفع شيت القالب (.xls / .csv) أو نسخ الصفوف ولصقها مباشرة.',
      });
    } finally {
      e.target.value = '';
    }
  };

  // ٤. اعتماد حفظ دفعة الإكسيل بالكامل وتوليد الأكواد والـ QR
  const handleConfirmBulkImport = () => {
    if (parsedPreview.length === 0) return;
    if (!hasAddAccess) {
      setFeedback({
        type: 'error',
        text: 'صلاحيتك الحالية مقتصرة على عرض وسحب أكواد المخدومين فقط دون الإضافة أو التعديل.',
      });
      return;
    }
    if (!canRegisterNow) {
      setFeedback({
        type: 'error',
        text: 'تسجيل المخدومين مغلق حالياً من قِبل إدارة الكرنفال (الأدمن).',
      });
      return;
    }

    const createdKids: KidParticipant[] = parsedPreview.map((row) => ({
      id: createRecordId('kid'),
      edition_id: edition.id,
      full_name: row.full_name,
      service_id: effectiveServiceId,
      grade_label: row.grade_label,
      parent_phone: row.parent_phone,
      health_notes: row.health_notes,
      team_name: row.team_name,
      pin_code: 'K' + generateRandomCode(5),
      qr_token: `KID-QR-${generateRandomCode(8)}`,
      registered_by_name: actorName,
      source: 'excel',
      created_at: getReadableNow(16),
    }));

    onAddKids(createdKids);
    setParsedPreview([]);
    setPastedRowsText('');
    if (hasCodesAccess) {
      setSubMode('list');
    }
    setFeedback({
      type: 'success',
      text: hasCodesAccess
        ? `تم استيراد وتسجيل (${createdKids.length}) مخدوم بنجاح وتوليد أكواد الدخول والـ QR لكل طفل!`
        : `تم استيراد وتسجيل (${createdKids.length}) مخدوم بنجاح وحفظ أكوادهم في سجل الأكواد المعتمد لدى الأدمن.`,
    });
  };

  // ٥. تصدير كشف أكواد المخدومين إلى شيت Excel / CSV
  const handleExportKidsCsv = () => {
    if (!hasCodesAccess) return;
    const headers =
      'اسم المخدوم,الخدمة,السنة الدراسية,كود الدخول (PIN),رمز الـ QR,رقم ولي الأمر,الفريق,ملاحظات صحية';
    const rows = visibleKids.map((k) => {
      const srvName = services.find((s) => s.id === k.service_id)?.name || '';
      return `"${k.full_name}","${srvName}","${k.grade_label}","${k.pin_code}","${k.qr_token}","${k.parent_phone}","${k.team_name}","${k.health_notes}"`;
    });
    const csvContent = `\uFEFF${headers}\n${rows.join('\n')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_أكواد_المخدومين_${effectiveServiceName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // فحص واختبار الـ QR الحقيقي لأي مخدوم
  const handleTestKidQr = async (kid: KidParticipant) => {
    if (testedKidQr?.kidId === kid.id) {
      setTestedKidQr(null);
      return;
    }
    const srvName = services.find((s) => s.id === kid.service_id)?.name || effectiveServiceName;
    const payloadStr = encodeCarnivalQrPayload({
      type: 'kid',
      name: kid.full_name,
      code: kid.qr_token,
      pin: kid.pin_code,
      service: srvName,
      phone: kid.parent_phone,
    });
    const decoded = decodeCarnivalQrPayload(payloadStr);
    let dataUrl: string | null = null;
    try {
      dataUrl = await QRCode.toDataURL(payloadStr, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch {
      dataUrl = null;
    }
    if (decoded) {
      setTestedKidQr({ kidId: kid.id, decoded, qrDataUrl: dataUrl });
    }
  };

  // بناء كانفاس بطاقة طفل واحد (لاستخدامه في التحميل الفردي أو اللوحة المجمعة)
  const renderKidCardCanvas = async (kid: KidParticipant): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 860;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#EA580C');
    grad.addColorStop(0.5, '#F59E0B');
    grad.addColorStop(1, '#0F4C81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 18);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F2942';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.fillText(edition.name, canvas.width / 2, 65);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 19px Cairo, sans-serif';
    const srvName = services.find((s) => s.id === kid.service_id)?.name || effectiveServiceName;
    ctx.fillText(`${edition.church_name} · ${srvName}`, canvas.width / 2, 102);

    ctx.fillStyle = '#0F2942';
    ctx.font = 'bold 30px Cairo, sans-serif';
    ctx.fillText(kid.full_name, canvas.width / 2, 160);

    ctx.fillStyle = '#EA580C';
    ctx.font = 'bold 20px Cairo, sans-serif';
    ctx.fillText(`${kid.grade_label} · ${kid.team_name}`, canvas.width / 2, 198);

    const qrBoxSize = 360;
    const qrStartX = (canvas.width - qrBoxSize) / 2;
    const qrStartY = 230;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.strokeRect(qrStartX - 16, qrStartY - 16, qrBoxSize + 32, qrBoxSize + 32);

    const payloadStr = encodeCarnivalQrPayload({
      type: 'kid',
      name: kid.full_name,
      code: kid.qr_token,
      pin: kid.pin_code,
      service: srvName,
      phone: kid.parent_phone,
    });

    try {
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, payloadStr, {
        width: qrBoxSize,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0F2942',
          light: '#FFFFFF',
        },
      });
      ctx.drawImage(qrCanvas, qrStartX, qrStartY, qrBoxSize, qrBoxSize);
    } catch {
      const qrMatrix = buildKidQrMatrix(kid.qr_token, 21);
      const cellSize = qrBoxSize / 21;
      ctx.fillStyle = '#0F2942';
      for (let r = 0; r < 21; r++) {
        for (let c = 0; c < 21; c++) {
          if (qrMatrix[r][c]) {
            ctx.fillRect(
              qrStartX + c * cellSize,
              qrStartY + r * cellSize,
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }
    }

    ctx.fillStyle = '#0F2942';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`PIN: ${kid.pin_code}`, canvas.width / 2, 665);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(kid.qr_token, canvas.width / 2, 705);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.fillText('بطاقة مخدوم معتمدة — الدخول بالكود أو بمسح رمز الـ QR', canvas.width / 2, 775);

    return canvas;
  };

  // ٦. تحميل بطاقة QR حقيقية لطفل كصورة PNG
  const handleDownloadKidQrBadge = async (kid: KidParticipant) => {
    if (!hasCodesAccess) return;
    const canvas = await renderKidCardCanvas(kid);
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR-Kid-${kid.pin_code}-${kid.full_name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ٧. سحب وتحميل لوحة مجمعة لكل بطاقات الـ QR دفعة واحدة كصورة عالية الدقة (PNG Sheet) أو مشاركتها مباشرة
  const handleDownloadAllKidsQrSheet = async (shareViaDevice = false) => {
    if (!hasCodesAccess || visibleKids.length === 0) return;
    setIsGeneratingBatchQr(true);
    try {
      const cols = visibleKids.length === 1 ? 1 : 2;
      const rows = Math.ceil(visibleKids.length / cols);
      const cardW = 700;
      const cardH = 860;
      const gap = 36;
      const pad = 40;

      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = pad * 2 + cols * cardW + (cols - 1) * gap;
      sheetCanvas.height = pad * 2 + rows * cardH + (rows - 1) * gap + 90;
      const ctx = sheetCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

      // عنوان اللوحة المجمعة
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F2942';
      ctx.font = 'bold 34px Cairo, sans-serif';
      ctx.fillText(
        `كشف بطاقات الـ QR المجمعة — ${effectiveServiceName} (${visibleKids.length} مخدوم)`,
        sheetCanvas.width / 2,
        62
      );

      for (let i = 0; i < visibleKids.length; i++) {
        const kid = visibleKids[i];
        const cardCanvas = await renderKidCardCanvas(kid);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gap);
        const y = 90 + pad + row * (cardH + gap);

        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 2, y - 2, cardW + 4, cardH + 4);
        ctx.drawImage(cardCanvas, x, y);
      }

      const dataUrl = sheetCanvas.toDataURL('image/png');
      const fileName = `لوحة_صور_أكواد_QR_${effectiveServiceName.replace(/\s+/g, '_')}.png`;

      if (shareViaDevice && typeof navigator !== 'undefined' && navigator.share) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `صور أكواد الـ QR (${effectiveServiceName})`,
            text: `مرفق لوحة بطاقات الـ QR للمخدومين (${visibleKids.length} مخدوم).`,
            files: [file],
          });
          setIsGeneratingBatchQr(false);
          return;
        }
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedback({
        type: 'success',
        text: `تم سحب وتحميل لوحة صور الـ QR المجمعة (${visibleKids.length} بطاقة) بنجاح على جهازك!`,
      });
    } finally {
      setIsGeneratingBatchQr(false);
    }
  };

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border-2 space-y-4 ${
        isLight
          ? 'bg-white border-amber-200/90 text-slate-900 shadow-lg'
          : 'bg-[#12192B] border-slate-800 text-slate-100 shadow-2xl'
      }`}
    >
      {/* الترويسة العلوية + اختيار المرحلة للأدمن */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-500/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold truncate">
              تسجيل المخدومين وإدارة الأكواد
            </h3>
            <p className="text-[11px] opacity-75 truncate">
              {effectiveServiceName} · المسجلون: <strong>{visibleKids.length} مخدوم</strong>
            </p>
          </div>
        </div>

        {isAdmin && (
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className={`w-full sm:w-auto min-h-[36px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-slate-800'
                : 'bg-[#0B101E] border-slate-700 text-slate-100'
            }`}
          >
            {services.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* أزرار التبديل بين الطرق الثلاث مضبوطة داخل إطار شاشة الموبايل */}
      <div
        className={`p-1 rounded-2xl border grid grid-cols-3 gap-1 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setSubMode('manual');
            setFeedback(null);
          }}
          className={`min-h-[38px] px-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subMode === 'manual'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          {hasAddAccess ? (
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          )}
          <span className="truncate">١. فردي</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubMode('excel');
            setFeedback(null);
          }}
          className={`min-h-[38px] px-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subMode === 'excel'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          {hasAddAccess ? (
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          )}
          <span className="truncate">٢. شيت إكسيل</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubMode('list');
            setFeedback(null);
          }}
          className={`min-h-[38px] px-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subMode === 'list'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          {hasCodesAccess ? (
            <QrCode className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          )}
          <span className="truncate">٣. الأكواد ({visibleKids.length})</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-3 border text-xs font-extrabold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/35 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {!hasAddAccess && (subMode === 'manual' || subMode === 'excel') ? (
        <div className="rounded-2xl p-5 border-2 border-blue-500/35 bg-blue-500/10 text-center space-y-3">
          <Lock className="w-8 h-8 text-blue-500 mx-auto" />
          <h4 className="text-sm font-extrabold text-blue-700 dark:text-sky-300">
            وضع عرض وسحب الأكواد فقط (قراءة واستعلام)
          </h4>
          <p className="text-xs opacity-85 leading-relaxed">
            صلاحيتك الممنوحة من الأدمن مخصصة لاستعراض وطباعة أكواد الـ QR للمخدومين فقط دون إضافة أو تعديل بيانات جديدة.
          </p>
          {hasCodesAccess && (
            <button
              type="button"
              onClick={() => setSubMode('list')}
              className="min-h-[38px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>الانتقال إلى كشف الأكواد ({visibleKids.length})</span>
            </button>
          )}
        </div>
      ) : !canRegisterNow && (subMode === 'manual' || subMode === 'excel') ? (
        <div className="rounded-2xl p-5 border-2 border-rose-500/35 bg-rose-500/10 text-center space-y-2">
          <Lock className="w-8 h-8 text-rose-500 mx-auto" />
          <h4 className="text-sm font-extrabold text-rose-600 dark:text-rose-300">
            تسجيل المخدومين مغلق حالياً بقرار من الأدمن
          </h4>
          <p className="text-xs opacity-85 leading-relaxed">
            قامت إدارة الكرنفال بإيقاف تسجيل أو رفع بيانات مخدومين جدد حالياً.
          </p>
        </div>
      ) : subMode === 'manual' ? (
        /* ================= ١. نموذج تسجيل مخدوم فردياً (بقوائم التكويد المنسدلة) ================= */
        <form onSubmit={handleManualAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold mb-1">اسم المخدوم رباعياً:</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: مينا سامح وديع جرجس"
                className={`w-full min-h-[42px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                    : 'bg-[#0B101E] border-slate-700 focus:border-orange-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold mb-1">
                السنة الدراسية (من شاشة التكويد):
              </label>
              <select
                value={gradeLabel}
                onChange={(e) => setGradeLabel(e.target.value)}
                className={`w-full min-h-[42px] px-3 rounded-xl border text-xs sm:text-sm font-extrabold outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                    : 'bg-[#0B101E] border-slate-700 text-white focus:border-orange-500'
                }`}
              >
                {codedGrades.map((grd) => (
                  <option key={grd.id} value={grd.name}>
                    {grd.name} ({grd.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold mb-1">رقم موبايل ولي الأمر:</label>
              <input
                type="tel"
                dir="ltr"
                maxLength={11}
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01223344556"
                className={`w-full min-h-[42px] px-3.5 rounded-xl border text-center font-mono text-xs sm:text-sm font-bold outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                    : 'bg-[#0B101E] border-slate-700 focus:border-orange-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold mb-1">
                اسم الفريق (من شاشة تكويد الفرق):
              </label>
              <select
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className={`w-full min-h-[42px] px-3 rounded-xl border text-xs sm:text-sm font-extrabold outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                    : 'bg-[#0B101E] border-slate-700 text-white focus:border-orange-500'
                }`}
              >
                {codedTeams.map((tm) => (
                  <option key={tm.id} value={tm.name}>
                    {tm.name} ({tm.color_label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold mb-1">
              ملاحظات صحية أو حساسية طعام (اختياري):
            </label>
            <input
              type="text"
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder="اتركها فارغة إن لم توجد ملاحظات"
              className={`w-full min-h-[42px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                  : 'bg-[#0B101E] border-slate-700 focus:border-orange-500'
              }`}
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-2xl bg-gradient-to-l from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>حفظ بيانات المخدوم وتوليد الكود والـ QR فوراً</span>
          </button>
        </form>
      ) : subMode === 'excel' ? (
        /* ================= ٢. رفع شيت إكسيل المزود بقوائم التكويد (List of Values) ================= */
        <div className="space-y-3.5">
          <div
            className={`rounded-2xl p-3.5 border space-y-3 ${
              isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#0B101E] border-slate-800'
            }`}
          >
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                الخطوة ١: حمّل شيت القالب الفارغ المحدث بقوائم التكويد (List of Values)
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                شيت الإكسيل الفارغ يحتوي داخله تلقائياً على قوائم منسدلة (List of Values) لعمود{' '}
                <strong>السنة الدراسية ({codedGrades.length} سنوات)</strong> وعمود{' '}
                <strong>اسم الفريق ({codedTeams.length} فرق)</strong> ومحدثة لحظياً من شاشة التكويد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadExcelWithDropdowns}
                className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>تحميل شيت إكسيل بقوائم منسدلة (.xls)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                    : 'bg-[#141D33] border-slate-700 text-emerald-300'
                }`}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>تحميل قالب CSV خفيف</span>
              </button>
            </div>

            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xls,.xml,.csv,.txt,.tsv"
              onChange={handleExcelFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => excelFileInputRef.current?.click()}
              className={`w-full min-h-[44px] rounded-2xl border-2 border-dashed font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isLight
                  ? 'border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-800'
                  : 'border-emerald-500/40 bg-[#141D33] hover:bg-slate-800 text-emerald-300'
              }`}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>اضغط لرفع شيت المخدومين (.xls / .csv) من جهازك</span>
            </button>
          </div>

          {/* لصق مباشر من برنامج Excel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-extrabold flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>أو الصق الصفوف المنسوخة مباشرة من Excel:</span>
              </label>
              <button
                type="button"
                onClick={() => parseSpreadsheetText(pastedRowsText)}
                className="min-h-[30px] px-2.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-amber-300 text-[11px] font-extrabold cursor-pointer shrink-0"
              >
                معاينة الصفوف
              </button>
            </div>
            <textarea
              rows={3}
              value={pastedRowsText}
              onChange={(e) => setPastedRowsText(e.target.value)}
              placeholder={`مثال:\nمينا سامح وديع جرجس, ${codedGrades[0]?.name || 'الصف الرابع'}, 01223344556, ${codedTeams[0]?.name || 'فريق أسود الكرنفال'}, لا توجد`}
              className={`w-full p-3 rounded-2xl border text-xs font-bold outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus:border-emerald-500 focus:bg-white'
                  : 'bg-[#0B101E] border-slate-700 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* جدول المعاينة قبل الاعتماد النهائي مع إمكانية تعديل السنة والفريق من قوائم التكويد */}
          {parsedPreview.length > 0 && (
            <div
              className={`rounded-2xl p-3.5 border space-y-3 ${
                isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-[#0B101E] border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold">
                  معاينة الأسماء الجاهزة للاستيراد ({parsedPreview.length} مخدوم):
                </span>
                <button
                  type="button"
                  onClick={handleConfirmBulkImport}
                  className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>اعتماد وتسجيل الكل ({parsedPreview.length})</span>
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {parsedPreview.map((row, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs space-y-2 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold">
                        {idx + 1}. {row.full_name}
                      </span>
                      <span dir="ltr" className="font-mono text-[11px] opacity-75">
                        {row.parent_phone}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <select
                        value={row.grade_label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedPreview((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, grade_label: val } : r))
                          );
                        }}
                        className={`min-h-[32px] px-2 rounded-lg border text-[11px] font-bold ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-700'
                        }`}
                      >
                        {!codedGrades.some((g) => g.name === row.grade_label) && (
                          <option value={row.grade_label}>{row.grade_label}</option>
                        )}
                        {codedGrades.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.team_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedPreview((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, team_name: val } : r))
                          );
                        }}
                        className={`min-h-[32px] px-2 rounded-lg border text-[11px] font-bold ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-700'
                        }`}
                      >
                        {!codedTeams.some((t) => t.name === row.team_name) && (
                          <option value={row.team_name}>{row.team_name}</option>
                        )}
                        {codedTeams.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !hasCodesAccess ? (
        /* ================= في حال عدم امتلاك الخادم صلاحية كشف الأكواد من الأدمن ================= */
        <div className="rounded-2xl p-5 border-2 border-amber-500/35 bg-amber-500/10 text-center space-y-2">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
            شاشة كشف الأكواد وتصديرها مخصصة للأدمن أو بتصريح خاص
          </h4>
          <p className="text-xs opacity-90 leading-relaxed">
            استعراض الأكواد أو سحب صور بطاقات الـ QR أو تصدير كشف الإكسيل متاح فقط للأدمن أو للخدام المفوضين من الأدمن.
          </p>
        </div>
      ) : (
        /* ================= ٣. قائمة المخدومين المسجلين وسحب صور الأكواد والـ QR ================= */
        <div className="space-y-3.5">
          {/* شريط سحب صور بطاقات الـ QR دفعة واحدة أو مشاركتها للموبايل / الجيميل / الواتساب */}
          <div
            className={`rounded-2xl p-3.5 border space-y-2.5 ${
              isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-[#0B101E] border-slate-800'
            }`}
          >
            <div className="text-xs font-extrabold text-blue-700 dark:text-sky-300 flex items-center gap-1.5">
              <Images className="w-4 h-4 shrink-0" />
              <span>سحب صور الأكواد والـ QR (مباشرة لجهازك أو مشاركتها للجيميل والواتساب):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isGeneratingBatchQr || visibleKids.length === 0}
                onClick={() => handleDownloadAllKidsQrSheet(false)}
                className="min-h-[38px] px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Images className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isGeneratingBatchQr
                    ? 'جاري تجهيز الصور...'
                    : `سحب صورة مجمعة للـ QR (${visibleKids.length})`}
                </span>
              </button>

              <button
                type="button"
                disabled={isGeneratingBatchQr || visibleKids.length === 0}
                onClick={() => handleDownloadAllKidsQrSheet(true)}
                className="min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>إرسال الصور (جيميل / واتساب)</span>
              </button>

              <button
                type="button"
                onClick={handleExportKidsCsv}
                className="min-h-[38px] px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>تصدير كشف الأكواد (Excel)</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الكود أو رقم ولي الأمر..."
              className={`w-full min-h-[40px] pr-9 pl-3 rounded-xl border text-xs font-bold outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus:border-blue-500 focus:bg-white'
                  : 'bg-[#0B101E] border-slate-700 focus:border-blue-500'
              }`}
            />
            <Search className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* بطاقة فحص واختبار الـ QR الحقيقي للمخدوم المحدد */}
          {testedKidQr && (
            <div
              className={`rounded-2xl p-3.5 border-2 flex flex-col sm:flex-row items-center gap-3 text-xs ${
                isLight
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
              }`}
            >
              {testedKidQr.qrDataUrl && (
                <div className="p-2 rounded-xl bg-white border border-emerald-200 shrink-0">
                  <img
                    src={testedKidQr.qrDataUrl}
                    alt={testedKidQr.decoded.name}
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}
              <div className="flex-1 space-y-1 text-center sm:text-right">
                <div className="font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>نتيجة فحص الـ QR الحقيقي للمخدوم:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-bold">
                  <div>
                    • الاسم: <strong>{testedKidQr.decoded.name}</strong>
                  </div>
                  <div>
                    • كود الدخول (PIN):{' '}
                    <strong dir="ltr" className="font-mono">
                      {testedKidQr.decoded.pin}
                    </strong>
                  </div>
                  <div>
                    • رمز الـ QR:{' '}
                    <strong dir="ltr" className="font-mono">
                      {testedKidQr.decoded.code}
                    </strong>
                  </div>
                  <div>
                    • المرحلة: <strong>{testedKidQr.decoded.service}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestedKidQr(null)}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-extrabold text-[11px] cursor-pointer shrink-0"
              >
                إغلاق
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {visibleKids.length === 0 ? (
              <div className="text-center py-8 text-xs opacity-70">
                لا يوجد مخدومون مسجلون في هذه المرحلة حالياً.
              </div>
            ) : (
              visibleKids.map((kid) => (
                <div
                  key={kid.id}
                  className={`p-3 rounded-2xl border space-y-2.5 ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#0B101E] border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold truncate">
                        {kid.full_name}
                      </div>
                      <div className="text-[11px] opacity-75">
                        {kid.grade_label} · {kid.team_name}
                        {kid.parent_phone ? ` · ولي الأمر: ${kid.parent_phone}` : ''}
                      </div>
                    </div>
                    {isAdmin && onDeleteKid && (
                      <button
                        type="button"
                        onClick={() => onDeleteKid(kid.id)}
                        title="حذف سجل المخدوم"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(kid.pin_code);
                        setCopiedId(kid.id);
                        setTimeout(() => setCopiedId(null), 1800);
                      }}
                      className={`min-h-[34px] px-2.5 rounded-xl border font-mono text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                        copiedId === kid.id
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : isLight
                          ? 'bg-white border-orange-300 text-orange-700 hover:bg-orange-50'
                          : 'bg-[#141D33] border-orange-500/40 text-amber-300'
                      }`}
                    >
                      {copiedId === kid.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{kid.pin_code}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTestKidQr(kid)}
                      className={`min-h-[34px] px-2.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                        testedKidQr?.kidId === kid.id
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : isLight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>فحص QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadKidQrBadge(kid)}
                      className="min-h-[34px] px-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-700 dark:text-sky-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>سحب صورة QR</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
