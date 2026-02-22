import { buildApp } from './app.js'

const app = await buildApp()

app.get('/health', async (req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() })
})

try {
    const port = Number(process.env['PORT'] ?? 4000)
    const host = process.env['HOST'] ?? '0.0.0.0'
    await app.listen({ port, host })
} catch (err) {
    app.log.error(err)
    process.exit(1)
}
