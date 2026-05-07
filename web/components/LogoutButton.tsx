'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      style={{
        width: '100%',
        background: 'none',
        color: 'var(--color-up)',
        border: '0.5px solid var(--color-up)',
        borderRadius: '10px',
        padding: '10px',
        fontSize: '14px',
        cursor: 'pointer',
      }}
    >
      로그아웃
    </button>
  )
}
