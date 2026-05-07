import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TopBar from '@/components/TopBar'
import TabBar from '@/components/TabBar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const displayName = session.user.name ?? session.user.email ?? ''
  const userInitial = displayName.charAt(0).toUpperCase() || '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      <TopBar userInitial={userInitial} />
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      <TabBar />
    </div>
  )
}
