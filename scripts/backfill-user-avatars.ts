//
//  backfill-user-avatars.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the backfill user avatars maintenance script for Argent, automating operational
//  or data-repair work that supports local development and administration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"
import { generateDefaultAvatarDataUrl } from "../lib/avatar"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function main() {
  const force = process.argv.includes("--force") || process.argv.includes("--all")
  const usersWithoutAvatar = await prisma.user.findMany({
    where: force ? undefined : {
      OR: [{ avatar: null }, { avatar: "" }],
    },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  })

  for (const user of usersWithoutAvatar) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatar: generateDefaultAvatarDataUrl(user.name || user.email),
      },
    })
  }

  console.log(`${force ? "Refreshed" : "Backfilled"} avatars for ${usersWithoutAvatar.length} user(s).`)
  for (const user of usersWithoutAvatar) {
    console.log(`- ${user.name} (${user.email})`)
  }
}

main()
  .catch((error) => {
    console.error("Avatar backfill failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
