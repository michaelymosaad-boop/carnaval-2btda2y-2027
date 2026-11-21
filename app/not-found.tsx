import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#080C17] via-[#0B101E] to-[#0E1528] text-slate-100"
    >
      <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-[#12192B]/95 p-7 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Compass className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-extrabold text-orange-400">خطأ 404</p>
          <h1 className="text-lg font-extrabold">الصفحة المطلوبة غير موجودة</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            تأكد من صحة الرابط أو ارجع إلى البوابة الرئيسية لكرنفال Reflection 2027.
          </p>
        </div>
        <Link
          href="/"
          className="min-h-[44px] w-full rounded-2xl bg-gradient-to-l from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للبوابة الرئيسية</span>
        </Link>
      </div>
    </main>
  );
}
