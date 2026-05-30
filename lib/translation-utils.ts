//
//  translation-utils.ts
//  Argent
//
//  Created by hilario on 23 May 2026 at 16:02.
//  Description: Provides shared translation utils logic for Argent, centralizing domain behavior,
//  helpers, or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
export type LooseTranslations = Record<string, string> & { [key: string]: unknown }

const EMPTY_TRANSLATIONS = {} as LooseTranslations

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function getTranslations(source: unknown, key?: string): LooseTranslations {
  const value = key === undefined
    ? source
    : isRecord(source)
      ? source[key]
      : undefined

  return isRecord(value) ? (value as LooseTranslations) : EMPTY_TRANSLATIONS
}
