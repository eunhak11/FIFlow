import IndexSSEProvider from '@/components/IndexSSEProvider'

export default function IndexSection() {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px 14px',
      }}
    >
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        주요 지수
      </div>
      <IndexSSEProvider initialData={[]} />
    </div>
  )
}
