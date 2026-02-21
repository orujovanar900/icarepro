const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const orgs = await prisma.organization.findMany();
    const users = await prisma.user.findMany();
    const contracts = await prisma.contract.findMany();
    console.log("Orgs:", orgs.length, "Users:", users.length, "Contracts:", contracts.length);
    if (contracts.length > 0) {
        console.log("Contract 0 Org ID:", contracts[0].organizationId);
        console.log("User 0 Org ID:", users[0].organizationId);
    }
}
main().catch(console.error);
