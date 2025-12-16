import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { logger } from '../logger'

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: Bun.env.DATABASE_URL,
  })
})

try {
  await prisma.$connect()
  logger.info('Connected to the database successfully.')
} catch (error) {
  logger.error(error, 'Error connecting to the database')
  process.exit(1)
}

export {
  prisma
}
