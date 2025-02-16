import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@openbooklm.com' },
    update: {},
    create: {
      id: 'demo-user',
      clerkId: 'demo-clerk-id',
      email: 'demo@openbooklm.com',
      name: 'Demo User',
    },
  })

  // Create a demo notebook
  const demoNotebook = await prisma.notebook.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      title: 'Demo Notebook',
      description: 'A demo notebook to showcase OpenBookLM features',
      content: 'Welcome to OpenBookLM! This is a demo notebook that showcases our features.',
      userId: demoUser.id,
      isPublic: true,
    },
  })

  console.log({ demoUser, demoNotebook })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
