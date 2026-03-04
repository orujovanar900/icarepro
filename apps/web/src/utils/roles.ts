export const ROLE_TRANSLATIONS: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    OWNER: 'Sahibkar',
    MANAGER: 'Menecer',
    CASHIER: 'Kassir',
    ACCOUNTANT: 'Mühasib',
    ADMINISTRATOR: 'Administrator',
    TENANT: 'İcarəçi',
};

export const translateRole = (role: string | undefined): string => {
    if (!role) return 'Bilinmir';
    return ROLE_TRANSLATIONS[role] || role;
};
