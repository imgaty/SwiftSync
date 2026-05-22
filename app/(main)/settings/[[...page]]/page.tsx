import { redirect } from "next/navigation"

const VALID_PAGES = ["account", "customization", "notifications", "shortcuts", "rules"]
const LEGACY_TO_CUSTOMIZATION = new Set(["general", "sidebar", "appearance"])

export default async function SettingsPage(props: { params: Promise<{ page?: string[] }> }) {
    const { page } = await props.params
    const raw = page?.[0] || ""
    const target = LEGACY_TO_CUSTOMIZATION.has(raw)
        ? "customization"
        : VALID_PAGES.includes(raw)
            ? raw
            : "account"
    redirect(`/?settings=${target}`)
}
