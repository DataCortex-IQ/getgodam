import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { validTokens } from '@/lib/tokens'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const expected = process.env.GODAM_PASSWORD

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = randomUUID()
  validTokens.add(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('godam_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
