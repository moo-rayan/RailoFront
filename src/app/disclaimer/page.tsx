import { Metadata } from "next"

export const metadata: Metadata = {
  title: "إخلاء المسئولية | TrainLiveEG",
}

export default function DisclaimerPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          </div>
          <h1 className="text-2xl font-bold">إخلاء المسئولية</h1>
          <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: مارس 2026</p>
        </div>
        <hr className="mb-8" />
        <div className="space-y-1 text-sm leading-7 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:mr-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_p]:mb-3">
          <h2>تطبيق غير رسمي</h2>
          <p>تطبيق TrainLiveEG هو مشروع اجتهاد شخصي مستقل تماماً، وليس له أي علاقة أو ارتباط بهيئة السكك الحديدية المصرية أو أي جهة حكومية أو خاصة أخرى. التطبيق لا يمثل الموقف الرسمي لأي جهة.</p>

          <h2>دقة المعلومات</h2>
          <p>المعلومات المعروضة في التطبيق — بما في ذلك مواقع القطارات الحية ومواعيد الرحلات — هي تقريبية وقد لا تكون دقيقة بنسبة 100%. مواقع القطارات تعتمد على بيانات GPS من أجهزة المساهمين وقد تتأثر بعوامل مثل ضعف إشارة GPS أو جودة الاتصال.</p>

          <h2>عدم ضمان الخدمة</h2>
          <ul>
            <li>لا نضمن توفر التطبيق أو الخدمة بشكل دائم ومتواصل.</li>
            <li>لا نضمن دقة أو اكتمال أو حداثة أي معلومات معروضة.</li>
            <li>لا نتحمل أي مسئولية عن قرارات تتخذها بناءً على معلومات التطبيق.</li>
          </ul>

          <h2>إخلاء المسئولية القانونية</h2>
          <p>لا يتحمل التطبيق أو مطوّره أي مسئولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق أو الاعتماد على المعلومات المقدمة فيه، بما في ذلك على سبيل المثال لا الحصر: تفويت قطار، الوصول متأخراً، أو أي خسائر ناتجة عن عدم دقة البيانات.</p>

          <h2>مساهمات المستخدمين</h2>
          <p>محتوى الشات ومساهمات التتبع يقدمها المستخدمون بشكل طوعي. نحن لا نتحمل مسئولية محتوى الرسائل التي يرسلها المستخدمون في الشات، رغم أننا نوفر آلية للإبلاغ عن المحتوى المخالف.</p>

          <h2>الموافقة</h2>
          <p>باستخدامك للتطبيق فإنك تقبل وتوافق على جميع بنود إخلاء المسئولية أعلاه.</p>
        </div>
      </div>
    </div>
  )
}
