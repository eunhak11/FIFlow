import ThemeToggle from '@/components/ThemeToggle'

export default function TopBar({ userInitial }: { userInitial: string }) {
  return (
    <header
      style={{
        background: 'var(--bg-subtle)',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
        FI<span style={{ color: 'var(--color-primary)' }}>Flow</span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--bg)',
            background: 'var(--color-primary)',
            padding: '3px 8px',
            borderRadius: '20px',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--bg)',
              display: 'inline-block',
              animation: 'pulse 1.5s infinite',
              flexShrink: 0,
            }}
          />
          LIVE
        </div>
        <ThemeToggle />
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--avatar-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--avatar-text)',
          }}
        >
          {userInitial}
        </div>
      </div>
    </header>
  )
}
