import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/')

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        padding: '32px 24px',
      }}
    >
      {/* 로고 */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#DEFF9A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          fontWeight: 800,
          color: '#050505',
          marginBottom: '20px',
        }}
      >
        FI
      </div>

      <div style={{ fontSize: '28px', fontWeight: 800, color: '#F5F5F5', marginBottom: '8px' }}>
        FIFlow
      </div>
      <div style={{ fontSize: '14px', color: '#A0A0A0', marginBottom: '48px', textAlign: 'center' }}>
        외국인 투자 동향 실시간 모니터링
      </div>

      <div style={{ width: '100%', maxWidth: '320px' }}>
        <LoginButton />
        <p
          style={{
            fontSize: '11px',
            color: '#606060',
            textAlign: 'center',
            marginTop: '16px',
            lineHeight: 1.6,
          }}
        >
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.<br />
          카카오 계정을 통해 안전하게 인증됩니다.
        </p>
      </div>
    </div>
  )
}
