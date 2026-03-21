import { memo } from 'react'
import { AlertCircle } from 'lucide-react'

export const ErrorAlert = memo(function ErrorAlert({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" aria-live="assertive" className="flex items-center gap-3 p-3 text-sm bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in-down">
      <div className="shrink-0 p-1 bg-red-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
      </div>
      <span className="text-red-600 dark:text-red-300 font-medium">{message}</span>
    </div>
  )
})
