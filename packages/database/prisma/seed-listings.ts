import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding listings...')

    // Find the first organization in the DB
    const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!org) {
        console.error('❌ No organization found. Run the main seed first.')
        process.exit(1)
    }
    console.log(`✅ Using org: ${org.name} (${org.id})`)

    // Clean existing seed listings
    await prisma.queueEntry.deleteMany({ where: { listing: { organizationId: org.id } } })
    await prisma.listing.deleteMany({ where: { organizationId: org.id } })
    console.log('🗑  Cleaned existing listings')

    const listings = await Promise.all([
        prisma.listing.create({
            data: {
                organizationId: org.id,
                title: 'Premium Ofis Mərkəzdə',
                description: 'Nəsimi rayonunda, biznes mərkəzinin 12-ci mərtəbəsinde yerləşən müasir ofis. Panoramik mənzərə, tam avadanlıqlı.',
                type: 'OFIS',
                district: 'Nəsimi',
                address: 'Nizami küçəsi 12, Bakı',
                floor: 12,
                totalFloors: 20,
                area: 180,
                basePrice: 3200,
                availStatus: 'BOSHALIR',
                contractEndDate: new Date('2025-06-30'),
                publisherType: 'Hüquqi şəxs',
                publisherName: org.name,
                isVip: true,
                isPushed: true,
                isPanorama: false,
                status: 'ACTIVE',
                amenities: ['MEBEL', 'KONDISIONER', 'LIFT', 'INTERNET', 'PARKLAMA', 'GUVƏNLIK'],
                photos: [],
            },
        }),
        prisma.listing.create({
            data: {
                organizationId: org.id,
                title: '3 Otaqlı Mənzil — Yasamal',
                description: 'Yasamal rayonunda 3 otaqlı yeni tikili mənzil. Metro yaxınlığında, bütün kommunal xidmətlər daxil.',
                type: 'MENZIL',
                district: 'Yasamal',
                address: 'Hüseyn Cavid pr. 45',
                floor: 7,
                totalFloors: 16,
                area: 95,
                rooms: 3,
                basePrice: 900,
                availStatus: 'BOSHDUR',
                publisherType: 'Fiziki şəxs',
                publisherName: 'Rəşad M.',
                isVip: false,
                isPushed: true,
                isPanorama: false,
                status: 'ACTIVE',
                amenities: ['MEBEL', 'KONDISIONER', 'LIFT', 'BALKON', 'INTERNET'],
                photos: [],
            },
        }),
        prisma.listing.create({
            data: {
                organizationId: org.id,
                title: 'Ticarət Mağazası — Nərimanov',
                description: 'Nərimanov metrosu yaxınlığında 1-ci mərtəbədə ticarət sahəsi. Küçə girişi, vitrin, anbar otağı mövcuddur.',
                type: 'MAGAZA',
                district: 'Nərimanov',
                address: 'Nərimanov küçəsi 78',
                floor: 1,
                totalFloors: 5,
                area: 120,
                basePrice: 2500,
                availStatus: 'BOSHALIR',
                contractEndDate: new Date('2025-07-15'),
                publisherType: 'Hüquqi şəxs',
                publisherName: org.name,
                isVip: false,
                isPushed: false,
                isPanorama: false,
                status: 'ACTIVE',
                amenities: ['KONDISIONER', 'GUVƏNLIK', 'PARKLAMA'],
                photos: [],
            },
        }),
        prisma.listing.create({
            data: {
                organizationId: org.id,
                title: '2 Otaqlı Mənzil — Xətai',
                description: 'Xətai rayonunda 2 otaqlı mənzil. Tam mebelli, kondisonerlə, ayrı mətbəx. Ailə üçün ideal.',
                type: 'MENZIL',
                district: 'Xətai',
                address: 'Əliağa Vahid küçəsi 19',
                floor: 4,
                totalFloors: 9,
                area: 72,
                rooms: 2,
                basePrice: 650,
                availStatus: 'TUTULUB',
                contractEndDate: new Date('2025-09-01'),
                publisherType: 'Fiziki şəxs',
                publisherName: 'Lalə H.',
                isVip: false,
                isPushed: false,
                isPanorama: false,
                status: 'ACTIVE',
                amenities: ['MEBEL', 'KONDISIONER', 'BALKON'],
                photos: [],
            },
        }),
        prisma.listing.create({
            data: {
                organizationId: org.id,
                title: 'Müasir Villa — Buzovna',
                description: 'Buzovnada 360m² 4 otaqlı villa. Hovuz, bağ, qaraj, 24 saat mühafizə. Tam avadanlıqlı.',
                type: 'MENZIL',
                district: 'Xəzər',
                address: 'Buzovna şossesi, 5-ci məhəllə',
                floor: 1,
                totalFloors: 3,
                area: 360,
                rooms: 4,
                basePrice: 5000,
                availStatus: 'BOSHDUR',
                publisherType: 'Hüquqi şəxs',
                publisherName: org.name,
                isVip: true,
                isPushed: true,
                isPanorama: true,
                status: 'ACTIVE',
                amenities: ['MEBEL', 'KONDISIONER', 'PARKLAMA', 'HOVUZ', 'GUVƏNLIK', 'ISITME'],
                photos: [],
            },
        }),
        prisma.listing.create({
            data: {
                organizationId: org.id,
                title: 'İş Mərkəzi Ofis — Sabail',
                description: 'Bakı şəhəri mərkəzindəki premium biznes kompleksindən ofis. Tam infrastruktur, görüş zalları daxil.',
                type: 'OFIS',
                district: 'Sabail',
                address: 'Neftçilər pr. 153',
                floor: 8,
                totalFloors: 22,
                area: 260,
                basePrice: 4800,
                availStatus: 'BOSHALIR',
                contractEndDate: new Date('2025-08-31'),
                publisherType: 'Hüquqi şəxs',
                publisherName: org.name,
                isVip: true,
                isPushed: false,
                isPanorama: true,
                status: 'ACTIVE',
                amenities: ['KONDISIONER', 'LIFT', 'INTERNET', 'PARKLAMA', 'GUVƏNLIK', 'TEXNIKI_XIDMET'],
                photos: [],
            },
        }),
    ])

    console.log(`✅ Created ${listings.length} listings`)

    // Add queue entries for listings
    const queueData = [
        // Listing 0 (ofis) — 11 entries (YUKSEK heat)
        ...Array.from({ length: 11 }, (_, i) => ({
            listingId: listings[0].id,
            fullName: `İstifadəçi ${i + 1}`,
            phone: `+994${50 + (i % 4)}${1234567 + i}`,
            email: `user${i + 1}@example.com`,
            employStatus: 'EMPLOYED' as const,
            persons: 1,
            hasPets: false,
            isSmoker: false,
            priceOffer: 3200 + i * 50,
            desiredMonths: 12,
            position: i + 1,
            status: 'ACTIVE' as const,
        })),
        // Listing 1 (menzil yasamal) — 5 entries (ORTA heat)
        ...Array.from({ length: 5 }, (_, i) => ({
            listingId: listings[1].id,
            fullName: `Müştəri ${i + 1}`,
            phone: `+994${51 + (i % 3)}${2345678 + i}`,
            email: `tenant${i + 1}@mail.com`,
            employStatus: 'EMPLOYED' as const,
            persons: 2 + (i % 3),
            hasPets: i === 2,
            isSmoker: false,
            priceOffer: 900 + i * 30,
            desiredMonths: 6 + i * 3,
            position: i + 1,
            status: 'ACTIVE' as const,
        })),
        // Listing 2 (magaza) — 7 entries (ORTA heat)
        ...Array.from({ length: 7 }, (_, i) => ({
            listingId: listings[2].id,
            fullName: `Şirkət ${i + 1}`,
            phone: `+994${12}${3456789 + i}`,
            email: `company${i + 1}@biz.az`,
            employStatus: 'EMPLOYED' as const,
            persons: 1,
            hasPets: false,
            isSmoker: false,
            companyName: `Şirkət ${i + 1} MMC`,
            priceOffer: 2500 + i * 100,
            desiredMonths: 24,
            position: i + 1,
            status: 'ACTIVE' as const,
        })),
        // Listing 4 (villa) — 3 entries (AZ heat)
        ...Array.from({ length: 3 }, (_, i) => ({
            listingId: listings[4].id,
            fullName: `VIP Müştəri ${i + 1}`,
            phone: `+994${55 + i}${9876543 + i}`,
            email: `vip${i + 1}@premium.az`,
            employStatus: 'EMPLOYED' as const,
            persons: 3 + i,
            hasPets: false,
            isSmoker: false,
            priceOffer: 5000 + i * 200,
            desiredMonths: 12,
            position: i + 1,
            status: 'ACTIVE' as const,
        })),
        // Listing 5 (iş mərkəzi) — 9 entries (YUKSEK heat)
        ...Array.from({ length: 9 }, (_, i) => ({
            listingId: listings[5].id,
            fullName: `Korporasiya ${i + 1}`,
            phone: `+994${12}${4567890 + i}`,
            email: `corp${i + 1}@enterprise.az`,
            employStatus: 'EMPLOYED' as const,
            persons: 1,
            hasPets: false,
            isSmoker: false,
            companyName: `Korporasiya ${i + 1} ASC`,
            voen: `123456789${i}`,
            priceOffer: 4800 + i * 120,
            desiredMonths: 36,
            position: i + 1,
            status: 'ACTIVE' as const,
        })),
    ]

    await prisma.queueEntry.createMany({ data: queueData })
    console.log(`✅ Created ${queueData.length} queue entries`)

    console.log('🎉 Listings seed complete!')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
