'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore, type AdminLevel } from '@/lib/stores/auth-store'
import { ShieldAlert } from 'lucide-react'

interface RequireAdminLevelProps {
  level: AdminLevel
  children: React.ReactNode
}

/**
 * Wraps a page to enforce a minimum admin level.
 * Monitor users trying to access fulladmin pages see an access denied message.
 */
export function RequireAdminLevel({ level, children }: RequireAdminLevelProps) {
  const { admin } = useAuthStore()

  if (!admin) return null

  if (level === 'fulladmin' && !admin.is_fulladmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold mb-2">غير مصرح</h2>
          <p className="text-sm text-muted-foreground">
            ليس لديك صلاحيات للوصول لهذه الصفحة. تواصل مع المسؤول الكامل للحصول على الصلاحيات المطلوبة.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
