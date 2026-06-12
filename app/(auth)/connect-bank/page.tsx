//
//  page.tsx
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Renders the required first bank connection step for authenticated users.
//
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth"
import { RequiredBankConnect } from "@/components/required-bank-connect"
import { getAuthContext } from "@/lib/auth-helpers"
import { hasImportedBankAccount } from "@/lib/onboarding"

export default async function ConnectBankPage() {
    const auth = await getAuthContext()
    if (!auth) redirect("/login?callbackUrl=/connect-bank")
    if (await hasImportedBankAccount(auth)) redirect("/")

    return (
        <AuthShell maxWidth="430px">
            <RequiredBankConnect />
        </AuthShell>
    )
}
