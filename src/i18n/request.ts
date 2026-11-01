import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { getPortalContext } from '@/lib/domains/portalContext'

export default getRequestConfig(async () => {
  const portal = await getPortalContext()
  const supported = portal.supportedLocales?.length ? portal.supportedLocales : ['en', 'fr']
  const fromCookie = (await cookies()).get('NEXT_LOCALE')?.value
  const locale =
    fromCookie && supported.includes(fromCookie) ? fromCookie
    : portal.defaultLocale && supported.includes(portal.defaultLocale) ? portal.defaultLocale
    : 'en'
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default }
})