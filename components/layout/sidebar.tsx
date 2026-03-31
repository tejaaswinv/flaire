"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardCheck,
  Activity,
  Pill,
  Apple,
  CalendarDays,
  TrendingUp,
  Users,
  FileText,
  Settings,
  Bell,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Check-in", href: "/check-in", icon: ClipboardCheck },
  { label: "Symptoms", href: "/symptoms", icon: Activity },
  { label: "Medications", href: "/medications", icon: Pill },
  { label: "Diet", href: "/diet", icon: Apple },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Insights", href: "/insights", icon: TrendingUp },
  { label: "Community", href: "/community", icon: Users },
  { label: "Activity", href: "/activity", icon: Bell },
  { label: "Records", href: "/records", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-white/40 bg-white/80 px-6 py-6 backdrop-blur-xl">
      <div className="mb-10 px-2">
        <h1 className="text-4xl font-bold tracking-tight text-[#7c9dc9]">
          Flaire
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Autoimmune patient manager
        </p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-4 rounded-[22px] px-5 py-4 text-[18px] font-medium transition-all ${
                isActive
                  ? "bg-[#8ea7cf] text-white shadow-[0_10px_30px_rgba(124,157,201,0.28)]"
                  : "text-slate-700 hover:bg-white hover:shadow-sm"
              }`}
            >
              <Icon
                size={22}
                className={isActive ? "text-white" : "text-slate-600"}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}