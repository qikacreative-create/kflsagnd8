export type SubscriptionLimits = {
  maxSchedulesPerMonth: number;
  maxAdmins: number;
  maxCrew: number;
  canAccessWebsiteSettings: boolean;
  canAccessBookingLink: boolean;
  canManageTeam: boolean;
  canChangeTheme: boolean;
  maxWebsites: number;
  maxDailyActions: number;
  maxDailyVisits: number;
};

export const SUBSCRIPTION_CONFIG: Record<string, SubscriptionLimits> = {
  standar: {
    maxSchedulesPerMonth: 100,
    maxAdmins: 0,
    maxCrew: 0,
    canAccessWebsiteSettings: false,
    canAccessBookingLink: false,
    canManageTeam: false,
    canChangeTheme: false,
    maxWebsites: 0,
    maxDailyActions: 0,
    maxDailyVisits: 10,
  },
  pro: {
    maxSchedulesPerMonth: 500,
    maxAdmins: 1,
    maxCrew: 2,
    canAccessWebsiteSettings: true,
    canAccessBookingLink: true,
    canManageTeam: true,
    canChangeTheme: true,
    maxWebsites: 1,
    maxDailyActions: 5,
    maxDailyVisits: 50,
  },
  ultimate: {
    maxSchedulesPerMonth: 1000,
    maxAdmins: 5,
    maxCrew: 20,
    canAccessWebsiteSettings: true,
    canAccessBookingLink: true,
    canManageTeam: true,
    canChangeTheme: true,
    maxWebsites: 2,
    maxDailyActions: 15,
    maxDailyVisits: 200,
  },
};

export const getLimits = (tier: string): SubscriptionLimits => {
  const normalizedTier = tier.toLowerCase();
  return SUBSCRIPTION_CONFIG[normalizedTier] || SUBSCRIPTION_CONFIG.standar;
};
