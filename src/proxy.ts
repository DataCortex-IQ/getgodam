import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'

const PROTECTED = ['/dashboard', '/entry', '/godown', '/ledger', '/cash', '/sauda']
const PUBLIC = ['/login', '/api/auth']

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (PUBLIC.some(p => path.startsWith(p))) {
    return NextResponse.next()
  }

  if (!PROTECTED.some(p => path.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const valid = await verifySessionToken(token)
  if (!valid) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/entry/:path*', '/godown/:path*', '/ledger/:path*', '/cash/:path*', '/sauda/:path*'],
}
