'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { verifyAdmin } from '@/lib/api/admin-auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Loader2 } from 'lucide-react'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/privacy', '/terms', '/delete-account']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { admin, accessToken, setAdmin, clearAuth, isLoading, setLoading } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      // Skip auth check for public paths
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        setLoading(false)
        return
      }

      const supabase = getSupabaseBrowserClient()

      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        clearAuth()
        router.replace('/login')
        return
      }

      const token = session.access_token

      // Verify admin status if we don't have it cached or token changed
      if (!admin || accessToken !== token) {
        try {
          const adminProfile = await verifyAdmin(token)
          setAdmin(adminProfile, token)
        } catch {
          clearAuth()
          await supabase.auth.signOut()
          router.replace('/login')
          return
        }
      } else {
        setLoading(false)
      }

      // Listen for auth state changes (token refresh, sign out)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: string, newSession: { access_token: string } | null) => {
          if (event === 'SIGNED_OUT' || !newSession) {
            clearAuth()
            router.replace('/login')
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            // Re-verify admin with new token
            try {
              const adminProfile = await verifyAdmin(newSession.access_token)
              setAdmin(adminProfile, newSession.access_token)
            } catch {
              clearAuth()
              await supabase.auth.signOut()
              router.replace('/login')
            }
          }
        }
      )

      return () => subscription.unsubscribe()
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Public paths don't need auth
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!admin) {
    return null
  }

  return <>{children}</>
}
