import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/entry', '/godown', '/ledger']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const session = req.cookies.get('godam_session')?.value
  if (!session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/entry/:path*', '/godown/:path*', '/ledger/:path*'],
}
