//
//  use-spreadsheet-documents.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the use spreadsheet documents React hook for Argent, encapsulating reusable
//  state, effects, or data-access behavior for consuming components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { apiFetch, queryKeys } from "@/lib/query-keys"
import type { SpreadsheetDocument } from "@/lib/types"

interface UseSpreadsheetDocumentsResult {
  documents: SpreadsheetDocument[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

async function fetchSpreadsheetDocuments(): Promise<SpreadsheetDocument[]> {
  return apiFetch<SpreadsheetDocument[]>("/api/spreadsheets")
}

export function useSpreadsheetDocuments(): UseSpreadsheetDocumentsResult {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.spreadsheets,
    queryFn: fetchSpreadsheetDocuments,
    staleTime: 60 * 1000,
    retry: false,
  })

  return {
    documents: data ?? [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load spreadsheets") : null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spreadsheets })
    },
  }
}
