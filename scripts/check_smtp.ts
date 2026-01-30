import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

function checkEnv() {
    const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PORT']
    const missing = required.filter(k => !process.env[k])

    if (missing.length > 0) {
        console.error('Missing ENV variables:', missing)
    } else {
        console.log('All SMTP variables are SET.')
        console.log('Host:', process.env.SMTP_HOST)
        console.log('User:', process.env.SMTP_USER)
    }
}

checkEnv()
