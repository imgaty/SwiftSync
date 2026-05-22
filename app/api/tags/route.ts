import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"

// GET /api/tags — List Tag rows for the active scope, sorted by name.
export async function GET() {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const permissionError = await requirePermission(ctx, "data:read")
    if (permissionError) return permissionError

    const tags = await prisma.tag.findMany({
        where: { ...scopeFilter(ctx), isArchived: false },
        orderBy: [{ name: "asc" }],
    })

    return NextResponse.json({ tags })
}

// Auto-derive a slug from a tag name. "Big Purchases!" → "big_purchases".
function slugify(input: string): string {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 64)
}

const tagCreateSchema = z.object({
    name: z.string().trim().min(1).max(50),
    slug: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9_-]+$/i, "Slug must use letters, digits, _ and - only")
        .optional(),
    color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex code like #6366f1")
        .optional(),
    icon: z.string().trim().min(1).max(40).optional(),
})

// POST /api/tags — Create a new tag in the caller's scope.
// Auto-generates slug from name if not provided. Rejects duplicate slugs.
export async function POST(request: Request) {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const permissionError = await requirePermission(ctx, "data:write")
    if (permissionError) return permissionError

    const body = await request.json().catch(() => null)
    const parsed = tagCreateSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid tag payload", details: parsed.error.issues.slice(0, 5) },
            { status: 400 },
        )
    }

    const { name, slug: providedSlug, color, icon } = parsed.data
    const slug = (providedSlug ?? slugify(name)).toLowerCase()
    if (!slug) {
        return NextResponse.json({ error: "Could not derive a slug from the name" }, { status: 400 })
    }

    // Reject duplicate slug within scope. No DB-level uniqueness on (scope, slug)
    // — same pattern as PACERule, see schema notes in lib/PACE.ts.
    const existing = await prisma.tag.findFirst({
        where: { ...scopeFilter(ctx), slug },
        select: { id: true },
    })
    if (existing) {
        return NextResponse.json(
            { error: `A tag with slug "${slug}" already exists` },
            { status: 409 },
        )
    }

    const tag = await prisma.tag.create({
        data: {
            ...scopeCreateData(ctx),
            slug,
            name,
            color: color ?? "#6366f1",
            icon: icon ?? "tag",
        },
    })

    return NextResponse.json(tag, { status: 201 })
}
