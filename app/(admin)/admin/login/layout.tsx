export default function AdminLoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // This layout bypasses the admin sidebar layout.
    // The admin login page renders its own minimal shell.
    return <>{children}</>
}
