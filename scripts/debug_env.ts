
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

console.log('Keys in process.env:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('TERM')))
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length)
console.log('POSTGRES_URL length:', process.env.POSTGRES_URL?.length)
