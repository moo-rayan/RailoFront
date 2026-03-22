"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth-store"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  MapPin,
  Train,
  Calendar,
  Users,
  BarChart3,
  Bell,
  Settings,
  HeadsetIcon,
  Smartphone,
  Shield,
  FileText,
  UserX,
  ExternalLink,
  LogOut,
} from "lucide-react"
import type { AdminLevel } from "@/lib/stores/auth-store"

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  minLevel: AdminLevel
}

const sidebarItems: SidebarItem[] = [
  {
    title: "لوحة التحكم",
    href: "/admin",
    icon: LayoutDashboard,
    minLevel: "monitor",
  },
  {
    title: "المحطات",
    href: "/admin/stations",
    icon: MapPin,
    minLevel: "monitor",
  },
  {
    title: "القطارات",
    href: "/admin/trains",
    icon: Train,
    minLevel: "monitor",
  },
  {
    title: "الجداول",
    href: "/admin/schedules",
    icon: Calendar,
    minLevel: "fulladmin",
  },
  {
    title: "التتبع الحي",
    href: "/admin/contributors",
    icon: Users,
    minLevel: "monitor",
  },
  {
    title: "التقارير",
    href: "/admin/analytics",
    icon: BarChart3,
    minLevel: "fulladmin",
  },
  {
    title: "الإشعارات",
    href: "/admin/notifications",
    icon: Bell,
    minLevel: "fulladmin",
  },
  {
    title: "الدعم والتواصل",
    href: "/admin/support",
    icon: HeadsetIcon,
    minLevel: "fulladmin",
  },
  {
    title: "إعدادات التطبيق",
    href: "/admin/app-config",
    icon: Smartphone,
    minLevel: "fulladmin",
  },
  {
    title: "الإعدادات",
    href: "/admin/settings",
    icon: Settings,
    minLevel: "fulladmin",
  },
]

function hasAccess(itemLevel: AdminLevel, userLevel: AdminLevel): boolean {
  if (userLevel === "fulladmin") return true
  return itemLevel === "monitor"
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { admin, clearAuth } = useAuthStore()
  const userLevel = admin?.admin_level ?? "monitor"

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch {}
    clearAuth()
    router.replace("/login")
  }

  const visibleItems = sidebarItems.filter((item) => hasAccess(item.minLevel, userLevel))

  return (
    <div className="flex h-full w-64 flex-col border-l bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Train className="h-6 w-6 text-primary ml-2" />
        <span className="text-xl font-bold">EGRailway</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* Legal Links */}
      <div className="border-t px-4 py-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-2">الصفحات القانونية</p>
        <Link
          href="/privacy"
          target="_blank"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Shield className="h-3.5 w-3.5" />
          سياسة الخصوصية
          <ExternalLink className="h-3 w-3 mr-auto" />
        </Link>
        <Link
          href="/terms"
          target="_blank"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          شروط الاستخدام
          <ExternalLink className="h-3 w-3 mr-auto" />
        </Link>
        <Link
          href="/delete-account"
          target="_blank"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <UserX className="h-3.5 w-3.5" />
          حذف الحساب
          <ExternalLink className="h-3 w-3 mr-auto" />
        </Link>
      </div>

      {/* User Info + Logout */}
      <div className="border-t p-4 space-y-3">
        {admin && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {admin.display_name?.charAt(0) || admin.email?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{admin.display_name || admin.email}</p>
              <p className="text-[10px] text-muted-foreground">
                {admin.is_fulladmin ? "مسؤول كامل" : "مراقب"}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">الإصدار 1.0.0</p>
          <p className="mt-1">© 2026 EGRailway</p>
        </div>
      </div>
    </div>
  )
}
