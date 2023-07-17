import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['en', 'zh-cn'],
  // If this locale is matched, pathnames work without a prefix
  defaultLocale: 'en',
})

export const config = {
  // Skip folder "api" and all files with an extension
  matcher: ['/((?!api|.*\\..*).*)'],
}
