import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  datasource: {
    // @ts-ignore
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
})
