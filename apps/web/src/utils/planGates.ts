import { useAuthStore } from '../store/auth';

export type PlanType = 'free' | 'starter' | 'pro' | 'business';
export type FeatureGate =
    | 'maxUnits'
    | 'maxUsers'
    | 'senadUstasi'
    | 'senadLimit'
    | 'pdfExport'
    | 'excelExport'
    | 'reports'
    | 'forecast'
    | 'addUnit'
    | 'addUser';

export const PLAN_LIMITS = {
    free: { maxUnits: 1, maxUsers: 1, senadUstasi: false, pdfExport: false, excelExport: false, reports: false, forecast: false },
    starter: { maxUnits: 5, maxUsers: 2, senadUstasi: false, pdfExport: true, excelExport: true, reports: true, forecast: true },
    pro: { maxUnits: 20, maxUsers: 5, senadUstasi: true, senadLimit: 30, pdfExport: true, excelExport: true, reports: true, forecast: true },
    business: { maxUnits: 50, maxUsers: 10, senadUstasi: true, senadLimit: null, pdfExport: true, excelExport: true, reports: true, forecast: true },
};

export function checkPlanLimit(plan: PlanType, feature: FeatureGate, count = 0): boolean {
    const L = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    if (feature === 'addUnit') return count < L.maxUnits;
    if (feature === 'addUser') return count < L.maxUsers;
    return !!(L as any)[feature];
}

export function usePlan() {
    const user = useAuthStore(state => state.user);
    const subPlanStr = user?.organization?.subscriptionPlan || 'FREE_TRIAL';

    let currentPlan: PlanType = 'free';
    if (subPlanStr === 'BASHLANQIC') currentPlan = 'starter';
    else if (subPlanStr === 'BIZNES' || subPlanStr === 'PROFESSIONAL') currentPlan = 'pro';
    else if (subPlanStr === 'KORPORATIV') currentPlan = 'business';

    // ENTERPRISE uses custom maxProperties from org, defaults to unlimited
    const isEnterprise = subPlanStr === 'ENTERPRISE';
    const orgMaxProperties = (user?.organization as any)?.maxProperties;

    return {
        plan: isEnterprise ? 'business' : currentPlan,
        isFree: !isEnterprise && currentPlan === 'free',
        isEnterprise,
        can: (feature: FeatureGate, count = 0) => {
            if (isEnterprise) {
                if (feature === 'addUnit') return orgMaxProperties ? count < orgMaxProperties : true;
                if (feature === 'maxUnits') return orgMaxProperties ?? Infinity;
                return true; // Enterprise unlocks all features
            }
            return checkPlanLimit(currentPlan, feature, count);
        },
        maxUnits: isEnterprise ? (orgMaxProperties ?? Infinity) : PLAN_LIMITS[currentPlan].maxUnits,
    };
}

// ─── Portal-only gating ───────────────────────────────────────────────────────

export type UserTier = 'PORTAL_ONLY' | 'BASIC' | 'PROFESSIONAL' | 'CORPORATE';

export function getUserTier(plan: string | null | undefined): UserTier {
    if (!plan || plan === 'PORTAL_ONLY' || plan === 'FREE_TRIAL') return 'PORTAL_ONLY';
    if (plan === 'BASHLANQIC') return 'BASIC';
    if (plan === 'BIZNES') return 'PROFESSIONAL';
    if (plan === 'KORPORATIV' || plan === 'ENTERPRISE') return 'CORPORATE';
    return 'PORTAL_ONLY';
}

export function canAccessPanel(tier: UserTier): boolean {
    return tier !== 'PORTAL_ONLY';
}

export function usePlanGate() {
    const user = useAuthStore(state => state.user);
    const plan = user?.organization?.subscriptionPlan ?? null;
    const tier = getUserTier(plan);
    const isPortalOnly = tier === 'PORTAL_ONLY';
    const isBasic = tier === 'BASIC';

    function requirePlan(minTier: UserTier, onBlocked: () => void): boolean {
        const tiers: UserTier[] = ['PORTAL_ONLY', 'BASIC', 'PROFESSIONAL', 'CORPORATE'];
        if (tiers.indexOf(tier) < tiers.indexOf(minTier)) {
            onBlocked();
            return false;
        }
        return true;
    }

    return { tier, isPortalOnly, isBasic, requirePlan };
}
