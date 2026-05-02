'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/plans', label: '계획', icon: CalendarDays },
  { href: '/tickers', label: '티커', icon: ListFilter },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex flex-col w-44 border-r shrink-0 fixed top-0 left-0 h-full bg-background z-10">
        <div className="h-14 flex items-center px-4 border-b font-semibold text-sm tracking-tight">
          Henry Ledger
        </div>
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 md:ml-44 pb-16 md:pb-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex md:hidden border-t bg-background">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              pathname === href
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
