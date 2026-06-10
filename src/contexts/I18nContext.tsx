'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { STRINGS, type Lang, type AppStrings, LANG_KEY } from '@/lib/i18n'

interface I18nContextValue {
  lang:      Lang
  setLang:   (l: Lang) => void
  toggleLang:() => void
  t:         AppStrings
}

const I18nContext = createContext<I18nContextValue>({
  lang:       'id',
  setLang:    () => {},
  toggleLang: () => {},
  t:          STRINGS.id,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id')

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null
    if (saved === 'id' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'id' ? 'en' : 'id')
  }, [lang, setLang])

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t: STRINGS[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}
