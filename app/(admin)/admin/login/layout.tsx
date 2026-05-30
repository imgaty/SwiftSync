//
//  layout.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the /admin/login route layout in Argent, providing shared structure, providers,
//  and navigation context for nested screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
export default function AdminLoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // This layout bypasses the admin sidebar layout.
    // The admin login page renders its own minimal shell.
    return <>{children}</>
}
