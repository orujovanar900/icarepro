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
    | 'photos'
    | 'addUnit'
    | 'addUser';

export const PLAN_LIMITS = {
    free: { maxUnits: 1, maxUsers: 1, senadUstasi: false, pdfExport: false, excelExport: false, reports: false, forecast: false, photos: false },
    starter: { maxUnits: 5, maxUsers: 2, senadUstasi: false, pdfExport: true, excelExport: true, reports: true, forecast: true, photos: true },
    pro: { maxUnits: 20, maxUsers: 5, senadUstasi: true, senadLimit: 30, pdfExport: true, excelExport: true, reports: true, forecast: true, photos: true },
    business: { maxUnits: 50, maxUsers: 10, senadUstasi: true, senadLimit: null, pdfExport: true, excelExport: true, reports: true, forecast: true, photos: true },
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

    return {
        plan: currentPlan,
        isFree: currentPlan === 'free',
        can: (feature: FeatureGate, count = 0) => checkPlanLimit(currentPlan, feature, count)
    };
}
