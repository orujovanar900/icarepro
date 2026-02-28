export function getTenantName(tenant: {
    tenantType: string
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
}): string {
    if (tenant.tenantType === 'fiziki') {
        return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
    }
    return tenant.companyName || ''
}
