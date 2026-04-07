import dotenv from 'dotenv'
dotenv.config()
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      firstName: true,
      lastName: true
    }
  })
  console.log('Total users:', users.length)
  console.log('Users:', JSON.stringify(users, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
