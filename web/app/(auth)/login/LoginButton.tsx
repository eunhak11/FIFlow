'use client'

import { signIn } from 'next-auth/react'

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn('kakao', { callbackUrl: '/' })}
      style={{
        width: '100%',
        background: '#FEE500',
        color: '#191919',
        border: 'none',
        borderRadius: '14px',
        padding: '16px',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#191919">
        <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.611 1.574 4.91 3.938 6.3L5 21l4.563-2.438C10.352 18.844 11.165 19 12 19c5.523 0 10-3.477 10-8.5S17.523 3 12 3z" />
      </svg>
      카카오로 시작하기
    </button>
  )
}
