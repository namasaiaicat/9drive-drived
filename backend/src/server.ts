import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'

async function start() {
  // Warm up database connection pool eagerly so the first API query is fast
  await prisma.$connect()
  app.listen(env.APP_PORT, () => {
    console.log(`Backend running on http://localhost:${env.APP_PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
