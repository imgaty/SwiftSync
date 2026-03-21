import { redirect } from "next/navigation"

export default function AdminLoginRedirectPage() {
    redirect("/login?callbackUrl=/admin")
}
