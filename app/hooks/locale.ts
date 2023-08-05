import { useLocale } from "next-intl"
import { SYSTEM_LANG_FIELD } from "@/app/utils/local-keys"
import { usePathname, useRouter } from 'next-intl/client'
import { useEffect } from "react"

/* Custom hook for loading local locale setting and rerouting if needed */
export default function useLocaleLoader() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    const localLocale = localStorage.getItem(SYSTEM_LANG_FIELD)
    if (localLocale && localLocale !== locale) {
      router.replace(pathname, { locale: localLocale })
    }
  }, [locale, pathname, router])
}