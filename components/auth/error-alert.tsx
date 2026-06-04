//
//  error-alert.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Error alert auth component for Argent, supporting sign-in, registration,
//  recovery, or security flows with reusable presentation logic.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { memo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { UDS } from '@/lib/UDS'

export const ErrorAlert = memo(function ErrorAlert({ message, children }: { message?: string; children?: ReactNode }) {
  if (!message && !children) return null
  return (
    <div role="alert" aria-live="assertive" className={`flex items-center gap-3 p-3 text-sm ${UDS.destructiveAlert} animate-fade-in-down`}>
      <div className="shrink-0 p-1 bg-red-500/20 sq-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
      </div>
      <span className="text-red-600 dark:text-red-300 font-medium">{children || message}</span>
    </div>
  )
})
