import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlanId = 'beta' | 'starter' | 'growth' | 'scale';

export type Plan = {
  id: PlanId;
  name: string;
  price: number; // in PHP
  cardHolderLimit: number; // 0 = unlimited
  scanLimit: number; // per month, 0 = unlimited
  announcementLimit: number; // per month, 0 = unlimited
  customIcons: boolean;
  customColors: boolean;
  analytics: boolean;
  storeMap: boolean;
  prioritySupport: boolean;
  multiLocation: boolean;
  apiAccess: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  beta: {
    id: 'beta', name: 'Beta (Free)', price: 0,
    cardHolderLimit: 0, scanLimit: 0, announcementLimit: 0,
    customIcons: true, customColors: true, analytics: true,
    storeMap: true, prioritySupport: false, multiLocation: false, apiAccess: false,
  },
  starter: {
    id: 'starter', name: 'Starter', price: 149,
    cardHolderLimit: 100, scanLimit: 500, announcementLimit: 10,
    customIcons: false, customColors: true, analytics: false,
    storeMap: true, prioritySupport: false, multiLocation: false, apiAccess: false,
  },
  growth: {
    id: 'growth', name: 'Growth', price: 349,
    cardHolderLimit: 1000, scanLimit: 0, announcementLimit: 0,
    customIcons: true, customColors: true, analytics: true,
    storeMap: true, prioritySupport: true, multiLocation: false, apiAccess: false,
  },
  scale: {
    id: 'scale', name: 'Scale', price: 799,
    cardHolderLimit: 0, scanLimit: 0, announcementLimit: 0,
    customIcons: true, customColors: true, analytics: true,
    storeMap: true, prioritySupport: true, multiLocation: true, apiAccess: true,
  },
};

const STORAGE_KEY = 'stampworth_subscription';

export type Subscription = {
  planId: PlanId;
  subscribedAt: string;
  expiresAt: string; // 30 days from subscribedAt
  paymentMethod: string; // "sandbox_card" | "sandbox_gcash" etc.
};

export const getSubscription = async (): Promise<Subscription | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sub = JSON.parse(raw) as Subscription;
    // Check if expired
    if (new Date(sub.expiresAt).getTime() < Date.now()) return null;
    return sub;
  } catch { return null; }
};

export const getActivePlan = async (): Promise<Plan> => {
  const sub = await getSubscription();
  if (!sub) return PLANS.beta;
  return PLANS[sub.planId] || PLANS.beta;
};

export const subscribe = async (planId: PlanId, paymentMethod: string): Promise<Subscription> => {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const sub: Subscription = {
    planId,
    subscribedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    paymentMethod,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  return sub;
};

export const cancelSubscription = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

// Check if a feature is allowed on current plan
export const checkLimit = async (feature: 'cardHolders' | 'scans' | 'announcements', currentCount: number): Promise<{ allowed: boolean; limit: number; planName: string }> => {
  const plan = await getActivePlan();
  const limits: Record<string, number> = {
    cardHolders: plan.cardHolderLimit,
    scans: plan.scanLimit,
    announcements: plan.announcementLimit,
  };
  const limit = limits[feature] || 0;
  return {
    allowed: limit === 0 || currentCount < limit,
    limit,
    planName: plan.name,
  };
};
