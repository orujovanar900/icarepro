import { buildApp } from '../app.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runBenchmark() {
    console.log('Building app for benchmark...')
    const app = await buildApp()
    await app.ready()

    // Get test user
    const ORG_ID = 'test-org-icare-test'
    const user = await prisma.user.findFirst({ where: { organizationId: ORG_ID } })
    if (!user) throw new Error('Test user not found')

    // Generate token
    const token = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        name: user.name,
        jwtVersion: user.jwtVersion,
    })

    console.log(`Starting benchmark for user ${user.email} in org ${ORG_ID} ...`)
    const iterations = 10
    let totalTime = 0

    const results = []

    for (let i = 0; i < iterations; i++) {
        const start = performance.now()

        const response = await app.inject({
            method: 'GET',
            url: '/contracts?limit=50',
            headers: {
                authorization: `Bearer ${token}`
            },
            cookies: {
                token: token
            }
        })

        const end = performance.now()
        const time = end - start
        totalTime += time

        results.push(time)

        if (response.statusCode !== 200) {
            console.error(`Request failed with status ${response.statusCode}: ${response.payload}`)
            break
        }

        if (i === 0) {
            const data = JSON.parse(response.payload)
            console.log(`First request returned ${data.data?.length} contracts out of total ${data.meta?.total}`)
        }
    }

    const avg = totalTime / results.length
    console.log('--- Benchmark Results ---')
    console.log(`Iterations: ${results.length}`)
    console.log(`Average time: ${avg.toFixed(2)} ms`)
    console.log(`Min time: ${Math.min(...results).toFixed(2)} ms`)
    console.log(`Max time: ${Math.max(...results).toFixed(2)} ms`)

    await app.close()
    await prisma.$disconnect()
}

runBenchmark().catch(console.error)
