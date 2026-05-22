import "dotenv/config"
import { prisma } from "../lib/prisma"
import { generateDefaultAvatarDataUrl } from "../lib/avatar"

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
