import { Toaster } from "@/components/ui/sonner"
import { CanvasBackground } from "@/components/canvas-background"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-8 dark:bg-black transition-colors duration-300">
      <CanvasBackground />
      <Toaster richColors closeButton position="top-center" />
      {children}
    </div>
  )
}
