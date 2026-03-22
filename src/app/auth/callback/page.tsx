'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { verifyAdmin } from '@/lib/api/admin-auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Loader2, ShieldAlert } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { setAdmin, clearAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // Get session from URL hash (Supabase OAuth callback)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError('فشل الحصول على جلسة صالحة. حاول تسجيل الدخول مرة أخرى.')
          return
        }

        const accessToken = session.access_token

        // Verify admin status via backend
        try {
          const adminProfile = await verifyAdmin(accessToken)
          setAdmin(adminProfile, accessToken)
          router.replace('/admin')
        } catch (apiError: any) {
          const status = apiError?.response?.status
          if (status === 403) {
            setError('ليس لديك صلاحيات الوصول للوحة التحكم. تواصل مع المسؤول.')
          } else if (status === 401) {
            setError('جلسة غير صالحة. حاول تسجيل الدخول مرة أخرى.')
          } else {
            setError('حدث خطأ أثناء التحقق من الصلاحيات.')
          }
          // Sign out from Supabase since user is not admin
          await supabase.auth.signOut()
          clearAuth()
        }
      } catch (err) {
        setError('حدث خطأ غير متوقع.')
      }
    }

    handleCallback()
  }, [router, setAdmin, clearAuth])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold mb-2">تم رفض الوصول</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
      </div>
    </div>
  )
}
