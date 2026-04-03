// Shared in-memory token store used by both the login route and middleware
// This works because Next.js API routes and middleware share the same Node process
// when running locally and on Vercel (serverless functions share within a warm instance)
const globalForTokens = global as unknown as { godamTokens: Set<string> }

if (!globalForTokens.godamTokens) {
  globalForTokens.godamTokens = new Set<string>()
}

export const validTokens: Set<string> = globalForTokens.godamTokens
