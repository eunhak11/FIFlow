'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--text-muted)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--text-muted)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  )
}

function EditIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--text-muted)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2.5" />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2.5" />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2.5" />
    </svg>
  )
}

function UserIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--color-primary)' : 'var(--text-muted)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const TABS = [
  { href: '/', label: '홈', Icon: HomeIcon },
  { href: '/calendar', label: '캘린더', Icon: CalendarIcon },
  { href: '/watchlist', label: '관리', Icon: EditIcon },
  { href: '/my', label: '마이', Icon: UserIcon },
]

export default function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        borderTop: '1px solid var(--border)',
        padding: '8px 0 20px',
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--bg-subtle)',
        flexShrink: 0,
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href
        const textColor = active ? 'var(--color-primary)' : 'var(--text-muted)'
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
              padding: '4px 16px',
            }}
          >
            <Icon active={active} />
            <span style={{ fontSize: '10px', color: textColor, fontWeight: active ? 700 : 400 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
