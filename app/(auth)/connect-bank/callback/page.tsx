//
//  page.tsx
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Handles the required first bank connection callback outside the main app shell.
//
import { BankCallbackImporter } from "@/components/bank-callback-importer"

export default function RequiredBankCallbackPage() {
    return (
        <BankCallbackImporter
            defaultRedirect="/"
            errorBackHref="/connect-bank"
            errorBackLabel="Back to bank setup"
            redirectingLabel="Redirecting to your dashboard..."
        />
    )
}
