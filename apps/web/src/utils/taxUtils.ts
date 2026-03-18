/**
 * Shared tax rate utility — used by ContractForm and ContractDetail.
 * All rates are decimal fractions (e.g. 0.10 = 10%).
 */

export interface OrgTaxProfile {
    ownerType: string | null | undefined
    activityLocation: string | null | undefined
    taxOfficeType: string | null | undefined
}

/**
 * Calculate the applicable tax rate for a given org tax profile.
 * Returns null when no profile is set or the profile is incomplete
 * (caller should hide the tax section entirely in that case).
 */
export function calculateTaxRate(org: OrgTaxProfile): number | null {
    if (!org.ownerType) return null

    switch (org.ownerType) {
        case 'FERDI_VETANDAS':
            if (org.activityLocation === 'RESIDENTIAL') return 0.10
            if (org.activityLocation === 'COMMERCIAL') return 0.14
            return null // location not set → can't calculate

        case 'FERDI_SAHIBKAR':
            // New taxOfficeType field takes precedence
            if (org.taxOfficeType === 'SIMPLIFIED') return 0.02
            if (org.taxOfficeType === 'STANDARD') return 0.04
            // Backward-compat: if taxOfficeType not yet set, fall back to activityLocation
            if (org.activityLocation === 'DIGER') return 0.02  // other city → simplified 2%
            if (org.activityLocation === 'BAKI') return 0.04   // Baku → standard 4%
            return null // not set → can't calculate

        case 'HUQUQI_SEXS':
            return 0.20  // 20% profit tax (+ VAT 18% handled separately if isVatPayer)

        default:
            return null
    }
}

/**
 * Format a decimal tax rate as a clean integer percentage string.
 * Uses Math.round to avoid floating-point display artifacts
 * (e.g. 0.14 * 100 = 14.000000000000002 → rounds to "14%").
 */
export function formatTaxRate(rate: number): string {
    return Math.round(rate * 100) + '%'
}
