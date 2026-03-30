import { Metadata } from "next"

export const metadata: Metadata = {
  title: "حذف الحساب | Railo Egypt",
}

export default function DeleteAccountPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <svg className="h-7 w-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h1 className="text-2xl font-bold">حذف الحساب</h1>
          <p className="mt-2 text-sm text-muted-foreground">طلب حذف حسابك في تطبيق Railo Egypt</p>
        </div>
        <hr className="mb-8" />
        <div className="space-y-1 text-sm leading-7 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:mr-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_p]:mb-3">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 mb-6">
            <p className="font-semibold text-destructive mb-2">⚠️ تحذير مهم</p>
            <p>عند تقديم طلب حذف الحساب، سيتم حذف جميع بياناتك نهائياً بعد <strong>30 يوماً</strong>. يمكنك إلغاء الطلب خلال هذه الفترة عن طريق تسجيل الدخول إلى التطبيق والذهاب إلى الإعدادات.</p>
          </div>

          <h2>1. البيانات التي سيتم حذفها</h2>
          <ul>
            <li>بيانات الملف الشخصي (الاسم، البريد الإلكتروني، صورة الحساب)</li>
            <li>سجل البحث والمفضلة</li>
            <li>سجل المحادثات</li>
            <li>الإشعارات والتفضيلات</li>
            <li>بيانات المساهمة في التتبع</li>
          </ul>

          <h2>2. كيفية تقديم طلب الحذف</h2>
          <p>يمكنك تقديم طلب حذف حسابك بإحدى الطريقتين:</p>
          <ul>
            <li><strong>من داخل التطبيق:</strong> اذهب إلى الإعدادات ← حذف الحساب ← طلب حذف الحساب</li>
            <li><strong>من صفحة الويب:</strong> يمكنك استخدام النموذج أدناه لتقديم طلب الحذف عبر بريدك الإلكتروني</li>
          </ul>

          <h2>3. فترة السماح</h2>
          <p>بعد تقديم الطلب، ستبدأ فترة سماح مدتها <strong>30 يوماً</strong>. خلال هذه الفترة:</p>
          <ul>
            <li>يمكنك الاستمرار في استخدام حسابك بشكل طبيعي</li>
            <li>يمكنك إلغاء طلب الحذف في أي وقت من إعدادات التطبيق</li>
            <li>بعد انتهاء الـ 30 يوماً، سيتم حذف حسابك وجميع بياناتك نهائياً ولا يمكن استعادتها</li>
          </ul>

          <h2>4. تقديم طلب الحذف</h2>
          <p>لتقديم طلب حذف حسابك عبر الويب، يُرجى التوجه إلى الرابط التالي:</p>

          <div className="mt-4 flex justify-center">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://railoeg.com/api/v1'}/account/delete-page`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              تقديم طلب حذف الحساب
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>

          <h2>5. التواصل معنا</h2>
          <p>إذا واجهت أي مشكلة في عملية حذف الحساب، يمكنك التواصل معنا عبر البريد الإلكتروني: <a href="mailto:support@railoeg.com" className="text-primary underline">support@railoeg.com</a></p>              
        </div>
      </div>
    </div>
  )
}
