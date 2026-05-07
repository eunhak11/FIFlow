import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'
import IndexSSEProvider from '@/components/IndexSSEProvider'
import type { IndexData } from '@/types/database'

export default async function IndexSection() {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, index_name, price, `change`, change_rate, updated_at FROM index_data ORDER BY index_name'
  )
  const indices: IndexData[] = (rows as RowDataPacket[]).map((r) => ({
    id: r.id,
    index_name: r.index_name,
    price: Number(r.price),
    change: Number(r.change),
    change_rate: Number(r.change_rate),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }))
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
      <IndexSSEProvider initialData={indices} />
    </div>
  )
}
