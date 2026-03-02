import { PrismaClient, RentalType, ContractStatus, PaymentType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting seed for 60 contracts...')
    const ORG_ID = 'test-org-icare-test'

    // Get existing property or create one
    let property = await prisma.property.findFirst({ where: { organizationId: ORG_ID } })
    if (!property) {
        property = await prisma.property.create({
            data: {
                organizationId: ORG_ID,
                number: 'TEST-P-1',
                name: 'Test Property',
                building: 'Test Building',
                address: 'Test Address',
                area: 100,
            }
        })
    }

    // Get existing tenant or create one
    let tenant = await prisma.tenant.findFirst({ where: { organizationId: ORG_ID } })
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                organizationId: ORG_ID,
                tenantType: 'fiziki',
                firstName: 'Test',
                lastName: 'Tenant',
            }
        })
    }

    const user = await prisma.user.findFirst({ where: { organizationId: ORG_ID } })
    if (!user) {
        throw new Error('User not found in TEST_ORG_ID')
    }

    // Delete existing contracts to have a clean slate? No, let's just add 60 more
    console.log(`Using Tenant ID: ${tenant.id}, Property ID: ${property.id}`)

    const contractsData = []

    for (let i = 0; i < 60; i++) {
        const contract = await prisma.contract.create({
            data: {
                organizationId: ORG_ID,
                number: `K-PERF-${Date.now()}-${i}`,
                propertyId: property.id,
                tenantId: tenant.id,
                rentalType: RentalType.RESIDENTIAL_LONG,
                monthlyRent: 1000,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2025-12-31'),
                status: ContractStatus.ACTIVE,
            }
        })

        // Add 2 payments for each
        await prisma.payment.createMany({
            data: [
                {
                    organizationId: ORG_ID,
                    contractId: contract.id,
                    amount: 1000,
                    paymentDate: new Date('2024-01-05'),
                    paymentType: PaymentType.CASH,
                    periodMonth: 1,
                    periodYear: 2024,
                    createdBy: user.id,
                },
                {
                    organizationId: ORG_ID,
                    contractId: contract.id,
                    amount: 1000,
                    paymentDate: new Date('2024-02-05'),
                    paymentType: PaymentType.BANK,
                    periodMonth: 2,
                    periodYear: 2024,
                    createdBy: user.id,
                }
            ]
        })
    }

    console.log('Seeded 60 contracts and 120 payments.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
