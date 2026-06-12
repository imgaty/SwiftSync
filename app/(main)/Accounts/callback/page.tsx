//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Accounts/callback route after Salt Edge redirects back to Argent.
//  Last changed by Codex on 07 June 2026.
//
import { BankCallbackImporter } from "@/components/bank-callback-importer"

export default function BankCallbackPage() {
  return <BankCallbackImporter defaultRedirect="/Accounts" />
}
