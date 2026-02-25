import { PrismaClient, UserRole, ContractStatus, RentalType, PaymentType } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const BCRYPT_ROUNDS = 12

// ─── Организация 1: İcarə Pro (основная) ─────────────────────────────────────
const MAIN_ORG_ID = 'default-org-icare-pro'

// ─── Организация 2: Icare Test (тестовые данные) ──────────────────────────────
const TEST_ORG_ID = 'test-org-icare-test'

async function main() {
    console.log('🌱 Seeding database...')

    // ── Организация 1 ──────────────────────────────────────────────────────────
    const mainOrg = await prisma.organization.upsert({
        where: { id: MAIN_ORG_ID },
        update: { name: 'İcarə Pro', slug: 'icare-pro' },
        create: {
            id: MAIN_ORG_ID,
            name: 'İcarə Pro',
            slug: 'icare-pro',
            plan: 'PRO',
            isActive: true,
        },
    })
    console.log(`✅ Organization: ${mainOrg.name} (${mainOrg.slug})`)

    const mainOwnerHash = await bcrypt.hash('anar900', BCRYPT_ROUNDS)
    const mainOwner = await prisma.user.upsert({
        where: { organizationId_email: { organizationId: MAIN_ORG_ID, email: 'admin@icare.pro.az' } },
        update: { passwordHash: mainOwnerHash },
        create: {
            organizationId: MAIN_ORG_ID,
            email: 'admin@icare.pro.az',
            passwordHash: mainOwnerHash,
            name: 'Administrator',
            role: UserRole.OWNER,
        },
    })
    console.log(`✅ Main owner: ${mainOwner.email}`)

    // ── Организация 2: Icare Test ──────────────────────────────────────────────
    const testOrg = await prisma.organization.upsert({
        where: { id: TEST_ORG_ID },
        update: { name: 'Icare Test', slug: 'icare-test' },
        create: {
            id: TEST_ORG_ID,
            name: 'Icare Test',
            slug: 'icare-test',
            plan: 'PRO',
            isActive: true,
        },
    })
    console.log(`✅ Organization: ${testOrg.name} (${testOrg.slug})`)

    const testOwnerHash = await bcrypt.hash('Test@2026!', BCRYPT_ROUNDS)
    const testOwner = await prisma.user.upsert({
        where: { organizationId_email: { organizationId: TEST_ORG_ID, email: 'owner@icare-test.az' } },
        update: { passwordHash: testOwnerHash },
        create: {
            organizationId: TEST_ORG_ID,
            email: 'owner@icare-test.az',
            passwordHash: testOwnerHash,
            name: 'Test Owner',
            role: UserRole.OWNER,
        },
    })
    console.log(`✅ Test owner: ${testOwner.email} / Test@2026!`)

    const testManagerHash = await bcrypt.hash('IcarePro2024!', BCRYPT_ROUNDS)
    const testManager = await prisma.user.upsert({
        where: { organizationId_email: { organizationId: TEST_ORG_ID, email: 'manager@icare-test.az' } },
        update: { passwordHash: testManagerHash },
        create: {
            organizationId: TEST_ORG_ID,
            email: 'manager@icare-test.az',
            passwordHash: testManagerHash,
            name: 'Aysel (Menecer)',
            role: UserRole.MANAGER,
        },
    })
    console.log(`✅ Test manager: ${testManager.email} / IcarePro2024!`)

    const testCashier = await prisma.user.upsert({
        where: { organizationId_email: { organizationId: TEST_ORG_ID, email: 'cashier@icare-test.az' } },
        update: { passwordHash: testManagerHash },
        create: {
            organizationId: TEST_ORG_ID,
            email: 'cashier@icare-test.az',
            passwordHash: testManagerHash,
            name: 'Leyla (Kassir)',
            role: UserRole.CASHIER,
        },
    })
    console.log(`✅ Test cashier: ${testCashier.email} / IcarePro2024!`)

    const testAccountant = await prisma.user.upsert({
        where: { organizationId_email: { organizationId: TEST_ORG_ID, email: 'accountant@icare-test.az' } },
        update: { passwordHash: testManagerHash },
        create: {
            organizationId: TEST_ORG_ID,
            email: 'accountant@icare-test.az',
            passwordHash: testManagerHash,
            name: 'Tural (Mühasib)',
            role: UserRole.ACCOUNTANT,
        },
    })
    console.log(`✅ Test accountant: ${testAccountant.email} / IcarePro2024!`)

    const testAdministrator = await prisma.user.upsert({
        where: { organizationId_email: { organizationId: TEST_ORG_ID, email: 'admin@icare-test.az' } },
        update: { passwordHash: testManagerHash },
        create: {
            organizationId: TEST_ORG_ID,
            email: 'admin@icare-test.az',
            passwordHash: testManagerHash,
            name: 'Ramil (İnzibatçı)',
            role: UserRole.ADMINISTRATOR,
        },
    })
    console.log(`✅ Test administrator: ${testAdministrator.email} / IcarePro2024!`)

    // ── Properties (3 объекта) ─────────────────────────────────────────────────
    const [prop1, prop2, prop3] = await Promise.all([
        prisma.property.upsert({
            where: { organizationId_number: { organizationId: TEST_ORG_ID, number: 'A-101' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                number: 'A-101',
                name: 'Mənzil A-101',
                building: 'Yaşayış Kompleksi "Bakı"',
                address: 'Nizami küçəsi 28, Bakı',
                area: 75.5,
            },
        }),
        prisma.property.upsert({
            where: { organizationId_number: { organizationId: TEST_ORG_ID, number: 'B-205' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                number: 'B-205',
                name: 'Ofis B-205',
                building: 'Biznes Mərkəzi "Crescent"',
                address: 'Neftçilər pr. 153, Bakı',
                area: 120.0,
            },
        }),
        prisma.property.upsert({
            where: { organizationId_number: { organizationId: TEST_ORG_ID, number: 'P-012' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                number: 'P-012',
                name: 'Parkinq P-012',
                building: 'Yeraltı Qaraj',
                address: 'İstiqlaliyyət küçəsi 5, Bakı',
                area: 15.0,
            },
        }),
    ])
    console.log('✅ Properties: A-101, B-205, P-012')

    // ── Tenants (3 арендатора) ─────────────────────────────────────────────────
    const [tenant1, tenant2, tenant3] = await Promise.all([
        prisma.tenant.upsert({
            where: { organizationId_voen: { organizationId: TEST_ORG_ID, voen: '1234567890' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                fullName: 'Əliyev Murad Elnur oğlu',
                phone: '+994501234567',
                email: 'murad.aliyev@email.com',
                voen: '1234567890',
            },
        }),
        prisma.tenant.upsert({
            where: { organizationId_voen: { organizationId: TEST_ORG_ID, voen: '9876543210' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                fullName: 'Hüseynova Leyla Kamran qızı',
                phone: '+994559876543',
                email: 'leyla.huseynova@biznes.az',
                voen: '9876543210',
            },
        }),
        prisma.tenant.upsert({
            where: { organizationId_voen: { organizationId: TEST_ORG_ID, voen: '5555555555' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                fullName: 'Quliyev Rauf Xəyal oğlu',
                phone: '+994705554433',
                voen: '5555555555',
            },
        }),
    ])
    console.log('✅ Tenants: 3 created')

    // ── Contracts (3 договора разных типов) ───────────────────────────────────
    const [contract1, contract2, contract3] = await Promise.all([
        // Тип 1: Долгосрочная жилая аренда
        prisma.contract.upsert({
            where: { organizationId_number: { organizationId: TEST_ORG_ID, number: 'K-2026-001' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                number: 'K-2026-001',
                propertyId: prop1.id,
                tenantId: tenant1.id,
                rentalType: RentalType.RESIDENTIAL_LONG,
                monthlyRent: 800,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2026-12-31'),
                status: ContractStatus.ACTIVE,
                depositAmount: 1600,
                taxRate: 14,
                notes: 'Uzunmüddətli mənzil icarəsi. Dördüncü ay endirimli.',
            },
        }),
        // Тип 2: Коммерческая аренда (базовая + % от выручки)
        prisma.contract.upsert({
            where: { organizationId_number: { organizationId: TEST_ORG_ID, number: 'K-2026-002' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                number: 'K-2026-002',
                propertyId: prop2.id,
                tenantId: tenant2.id,
                rentalType: RentalType.COMMERCIAL,
                monthlyRent: 2000,
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-12-31'),
                status: ContractStatus.ACTIVE,
                baseRent: 1500,
                revenuePercent: 3.5,
                taxRate: 18,
                depositAmount: 4000,
                notes: 'Kommersiya icarəsi. Əsas + gəlirdən 3.5%.',
            },
        }),
        // Тип 4: Парковочное место (дневная ставка)
        prisma.contract.upsert({
            where: { organizationId_number: { organizationId: TEST_ORG_ID, number: 'K-2026-003' } },
            update: {},
            create: {
                organizationId: TEST_ORG_ID,
                number: 'K-2026-003',
                propertyId: prop3.id,
                tenantId: tenant3.id,
                rentalType: RentalType.PARKING,
                monthlyRent: 150,
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-07-31'),
                status: ContractStatus.ACTIVE,
                dailyRate: 5,
                notes: 'Parkinq yeri icarəsi.',
            },
        }),
    ])
    console.log('✅ Contracts: K-2026-001 (RESIDENTIAL_LONG), K-2026-002 (COMMERCIAL), K-2026-003 (PARKING)')

    // ── Payments (тестовые платежи) ────────────────────────────────────────────
    // Для Contract 1 — заплатил январь и февраль
    await prisma.payment.create({
        data: {
            organizationId: TEST_ORG_ID,
            contractId: contract1.id,
            amount: 800,
            paymentDate: new Date('2025-01-05'),
            paymentType: PaymentType.CASH,
            periodMonth: 1,
            periodYear: 2025,
            createdBy: testOwner.id,
            note: 'Yanvar ayı üçün icarə ödənişi',
        },
    })

    await prisma.payment.create({
        data: {
            organizationId: TEST_ORG_ID,
            contractId: contract1.id,
            amount: 800,
            paymentDate: new Date('2025-02-03'),
            paymentType: PaymentType.BANK,
            periodMonth: 2,
            periodYear: 2025,
            createdBy: testOwner.id,
        },
    })

    // Для Contract 2 — февраль 2026 (частичная оплата → долг)
    await prisma.payment.create({
        data: {
            organizationId: TEST_ORG_ID,
            contractId: contract2.id,
            amount: 1500,
            paymentDate: new Date('2026-02-10'),
            paymentType: PaymentType.ONLINE,
            periodMonth: 2,
            periodYear: 2026,
            createdBy: testOwner.id,
            note: 'Fevral üçün qismən ödəniş (500 borc qalır)',
        },
    })

    console.log('✅ Payments: 3 test payments created')

    // ── Expense (тестовые расходы) ─────────────────────────────────────────────
    await prisma.expense.create({
        data: {
            organizationId: TEST_ORG_ID,
            amount: 350,
            date: new Date('2026-02-05'),
            category: 'Texniki xidmət',
            description: 'Santexnik işləri — B-205 ofis',
            createdBy: testOwner.id,
        },
    })
    console.log('✅ Expense: 1 test expense created')

    console.log('');
    console.log('═══════════════════════════════════════════════════')
    console.log('🌱 Seeding complete.')
    console.log('═══════════════════════════════════════════════════')
    console.log(`📋 LOGIN CREDENTIALS:`)
    console.log(`   İcarə Pro (OWNER):  admin@icare.pro.az  /  anar900`)
    console.log(`   Icare Test (OWNER): owner@icare-test.az /  Test@2026!`)
    console.log(`   Icare Test (MANAGER): manager@icare-test.az /  IcarePro2024!`)
    console.log(`   Icare Test (CASHIER): cashier@icare-test.az /  IcarePro2024!`)
    console.log(`   Icare Test (ACCTG):   accountant@icare-test.az / IcarePro2024!`)
    console.log(`   Icare Test (ADMIN):   admin@icare-test.az /    IcarePro2024!`)
    console.log('═══════════════════════════════════════════════════')
    console.log(`📦 Test org ID:  ${TEST_ORG_ID}`)
    console.log(`📄 Contracts:    K-2026-001 | K-2026-002 | K-2026-003`)
    console.log('═══════════════════════════════════════════════════')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
