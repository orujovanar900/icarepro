import * as Sentry from "@sentry/node"

Sentry.init({
    dsn: "https://4ca1f090c302985d89ad1751b023ed83@o4510977136459776.ingest.de.sentry.io/4510977186463824",
    environment: process.env['NODE_ENV'] || "production",
    tracesSampleRate: 0.1
})

import { buildApp } from './app.js'

const app = await buildApp()

Sentry.setupFastifyErrorHandler(app)

try {
    const port = Number(process.env['PORT'] ?? 4000)
    const host = process.env['HOST'] ?? '0.0.0.0'
    await app.listen({ port, host })
} catch (err) {
    app.log.error(err)
    process.exit(1)
}
