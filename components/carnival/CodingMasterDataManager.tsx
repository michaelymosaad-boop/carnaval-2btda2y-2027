'use client';

import React, { useState } from 'react';
import {
  Layers,
  Users,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import {
  INITIAL_CODED_GRADES,
  INITIAL_CODED_TEAMS,
  createRecordId,
  type CodedGradeItem,
  type CodedTeamItem,
} from '@/lib/carnival-store';

interface CodingMasterDataManagerProps {
  codedGrades: CodedGradeItem[];
  codedTeams: CodedTeamItem[];
  isLight: boolean;
  onSaveCodedGrades: (grades: CodedGradeItem[]) => void;
  onSaveCodedTeams: (teams: CodedTeamItem[]) => void;
}

export const CodingMasterDataManager: React.FC<CodingMasterDataManagerProps> = ({
  codedGrades,
  codedTeams,
  isLight,
  onSaveCodedGrades,
  onSaveCodedTeams,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grades' | 'teams'>('grades');
  const [newGradeName, setNewGradeName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('برتقالي ذهبي');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newGradeName.trim();
    if (!clean) return;
    if (codedGrades.some((g) => g.name === clean)) {
      setFeedback('هذه السنة الدراسية مكوّدة وموجودة بالفعل في القائمة.');
      return;
    }
    const nextCode = `GRD-${String(codedGrades.length + 1).padStart(2, '0')}`;
    const updated: CodedGradeItem[] = [
      ...codedGrades,
      {
        id: createRecordId('grd'),
        code: nextCode,
        name: clean,
      },
    ];
    onSaveCodedGrades(updated);
    setNewGradeName('');
    setFeedback(`تم تكويد وإضافة السنة الدراسية (${clean}) وتحديث قوائم التسجيل وشيت الإكسيل فوراً.`);
  };

  const handleDeleteGrade = (id: string) => {
    if (codedGrades.length <= 1) return;
    const updated = codedGrades.filter((g) => g.id !== id);
    onSaveCodedGrades(updated);
    setFeedback('تم حذف السنة الدراسية وتحديث القوائم المنسدلة وشيت القالب.');
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTeamName.trim();
    if (!clean) return;
    if (codedTeams.some((t) => t.name === clean)) {
      setFeedback('هذا الفريق مكوّد وموجود بالفعل في القائمة.');
      return;
    }
    const nextCode = `TM-${String(codedTeams.length + 1).padStart(2, '0')}`;
    const updated: CodedTeamItem[] = [
      ...codedTeams,
      {
        id: createRecordId('tm'),
        code: nextCode,
        name: clean,
        color_label: newTeamColor.trim() || 'برتقالي ذهبي',
      },
    ];
    onSaveCodedTeams(updated);
    setNewTeamName('');
    setFeedback(`تم تكويد وإضافة الفريق (${clean}) وتحديث قوائم التسجيل وشيت الإكسيل فوراً.`);
  };

  const handleDeleteTeam = (id: string) => {
    if (codedTeams.length <= 1) return;
    const updated = codedTeams.filter((t) => t.id !== id);
    onSaveCodedTeams(updated);
    setFeedback('تم حذف الفريق وتحديث القوائم المنسدلة وشيت القالب.');
  };

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border-2 space-y-4 ${
        isLight
          ? 'bg-white border-amber-200 text-slate-900 shadow-md'
          : 'bg-[#12192B] border-slate-800 text-slate-100'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold">
              تكويد السنوات الدراسية والفرق (List of Values)
            </h3>
            <p className="text-[11px] opacity-75">
              تظهر هذه القوائم تلقائياً عند تسجيل المخدومين وداخل شيت القالب الفارغ (Excel)
            </p>
          </div>
        </div>
      </div>

      {/* تنبيه ارتباط التكويد بشيت الإكسيل الفارغ */}
      <div
        className={`rounded-2xl p-3 border text-xs font-bold flex items-start gap-2 leading-relaxed ${
          isLight
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          أي تعديل هنا يُحدّث فوراً <strong>القوائم المنسدلة (List of Values)</strong> في شاشة تسجيل المخدومين وفي <strong>شيت القالب الفارغ (Excel)</strong> عند تحميله.
        </span>
      </div>

      {/* التبديل بين شاشة تكويد السنة الدراسية وشاشة تكويد الفريق */}
      <div
        className={`p-1 rounded-2xl border grid grid-cols-2 gap-1 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('grades');
            setFeedback(null);
          }}
          className={`min-h-[40px] px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'grades'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>١. تكويد السنة الدراسية ({codedGrades.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('teams');
            setFeedback(null);
          }}
          className={`min-h-[40px] px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'teams'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>٢. تكويد الفرق ({codedTeams.length})</span>
        </button>
      </div>

      {feedback && (
        <div className="rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {activeSubTab === 'grades' ? (
        <div className="space-y-3.5">
          <form onSubmit={handleAddGrade} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              placeholder="اسم السنة الدراسية (مثال: الصف الرابع الابتدائي)"
              className={`flex-1 min-h-[42px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:bg-white'
                  : 'bg-[#0B101E] border-slate-700 focus:border-indigo-500'
              }`}
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سنة دراسية</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-xs font-extrabold">
            <span>قائمة السنوات الدراسية المكوّدة ({codedGrades.length}):</span>
            <button
              type="button"
              onClick={() => {
                onSaveCodedGrades(INITIAL_CODED_GRADES);
                setFeedback('تمت استعادة قائمة السنوات الدراسية الافتراضية.');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {codedGrades.map((grd) => (
              <div
                key={grd.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    dir="ltr"
                    className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-mono text-[10px] font-extrabold shrink-0"
                  >
                    {grd.code}
                  </span>
                  <span className="font-extrabold truncate">{grd.name}</span>
                </div>
                {codedGrades.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGrade(grd.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                    title="حذف السنة الدراسية"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <form onSubmit={handleAddTeam} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="اسم الفريق (مثال: فريق أسود الكرنفال)"
              className={`sm:col-span-2 min-h-[42px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                  : 'bg-[#0B101E] border-slate-700 focus:border-orange-500'
              }`}
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newTeamColor}
                onChange={(e) => setNewTeamColor(e.target.value)}
                placeholder="اللون المميز"
                className={`flex-1 min-w-0 min-h-[42px] px-3 rounded-xl border text-xs font-bold outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                    : 'bg-[#0B101E] border-slate-700 focus:border-orange-500'
                }`}
              />
              <button
                type="submit"
                className="min-h-[42px] px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between text-xs font-extrabold">
            <span>قائمة الفرق المكوّدة ({codedTeams.length}):</span>
            <button
              type="button"
              onClick={() => {
                onSaveCodedTeams(INITIAL_CODED_TEAMS);
                setFeedback('تمت استعادة قائمة الفرق الافتراضية.');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {codedTeams.map((tm) => (
              <div
                key={tm.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      dir="ltr"
                      className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-amber-300 font-mono text-[10px] font-extrabold shrink-0"
                    >
                      {tm.code}
                    </span>
                    <span className="font-extrabold truncate">{tm.name}</span>
                  </div>
                  <div className="text-[10px] opacity-70 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-500" />
                    <span>اللون: {tm.color_label}</span>
                  </div>
                </div>
                {codedTeams.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(tm.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                    title="حذف الفريق"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
