import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

try {
  await prisma.$connect()
  console.log('Connected to the database successfully.')
} catch (error) {
  console.error('Error connecting to the database:', error)
  process.exit(1)
}

export {
  prisma
}
