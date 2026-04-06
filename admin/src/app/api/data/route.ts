import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET() {
  try {
    const [custCount, merchCount, cardCount, stampCount, rewardCount, annCount, txCount] = await Promise.all([
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("merchants").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("loyalty_cards").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("stamps").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("redeemed_rewards").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("merchant_announcements").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }),
    ]);

    const stats = {
      totalCustomers: custCount.count || 0,
      totalMerchants: merchCount.count || 0,
      totalLoyaltyCards: cardCount.count || 0,
      totalStampsIssued: stampCount.count || 0,
      totalRewardsRedeemed: rewardCount.count || 0,
      totalAnnouncements: annCount.count || 0,
      totalTransactions: txCount.count || 0,
    };

    const { data: customers } = await supabaseAdmin.from("customers").select("id, email, full_name, username, phone_number, created_at").order("created_at", { ascending: false }).limit(500);
    const { data: merchants } = await supabaseAdmin.from("merchants").select("id, auth_id, owner_email, business_name, address, city, is_active, created_at, phone_number, latitude, longitude, logo_url").order("created_at", { ascending: false }).limit(500);
    const { data: transactions } = await supabaseAdmin.from("transactions").select("id, merchant_id, customer_id, transaction_type, stamp_count_after, notes, created_at").order("created_at", { ascending: false }).limit(500);
    const { data: rewards } = await supabaseAdmin.from("redeemed_rewards").select("id, merchant_id, customer_id, reward_code, stamps_used, is_used, used_at, created_at").order("created_at", { ascending: false }).limit(500);
    const { data: loyaltyCards } = await supabaseAdmin.from("loyalty_cards").select("id, customer_id, merchant_id, stamp_count, total_stamps_earned, is_free_redemption, created_at").limit(5000);
    const { data: stampSettings } = await supabaseAdmin.from("stamp_settings").select("merchant_id, stamps_per_redemption, card_color, stamp_icon_name").limit(500);
    const { data: supportMessages } = await supabaseAdmin.from("support_messages").select("*").order("created_at", { ascending: false }).limit(500);

    // Build lookup maps
    const merchantMap = new Map((merchants || []).map((m) => [m.id, m]));
    const customerMap = new Map((customers || []).map((c) => [c.id, c]));

    const enrich = (items: any[]) => items.map((item) => ({
      ...item,
      merchants: merchantMap.get(item.merchant_id) || null,
      customers: customerMap.get(item.customer_id) || null,
    }));

    // Build merchant stats: active card holders, total stamps earned, total rewards redeemed
    const merchantStats: Record<string, { cardHolders: number; totalStampsEarned: number; totalRewardsRedeemed: number; stampsPerRedemption: number; cardColor: string; stampIcon: string }> = {};
    for (const m of merchants || []) {
      const cards = (loyaltyCards || []).filter((c) => c.merchant_id === m.id);
      const mRewards = (rewards || []).filter((r) => r.merchant_id === m.id);
      const settings = (stampSettings || []).find((s) => s.merchant_id === m.id);
      merchantStats[m.id] = {
        cardHolders: cards.length,
        totalStampsEarned: cards.reduce((sum: number, c: any) => sum + (c.total_stamps_earned || 0), 0),
        totalRewardsRedeemed: mRewards.filter((r: any) => r.is_used).length,
        stampsPerRedemption: settings?.stamps_per_redemption || 10,
        cardColor: settings?.card_color || "#2F4366",
        stampIcon: settings?.stamp_icon_name || "star",
      };
    }

    // Analytics: compute time-series and derived metrics
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const daysAgo = (d: number) => { const t = new Date(now); t.setDate(t.getDate() - d); return t.toISOString().split("T")[0]; };

    const countByDay = (items: any[], field = "created_at", days = 30) => {
      const counts: Record<string, number> = {};
      for (let i = days - 1; i >= 0; i--) counts[daysAgo(i)] = 0;
      for (const item of items) {
        const day = (item[field] || "").split("T")[0];
        if (day in counts) counts[day]++;
      }
      return Object.entries(counts).map(([date, count]) => ({ date, count }));
    };

    const allCustomers = customers || [];
    const allMerchants = merchants || [];
    const allTx = transactions || [];
    const allRewards = rewards || [];
    const allCards = loyaltyCards || [];

    // Growth over last 30 days
    const customerGrowth = countByDay(allCustomers);
    const merchantGrowth = countByDay(allMerchants);
    const transactionActivity = countByDay(allTx);
    const rewardActivity = countByDay(allRewards);

    // Signups this week / last week
    const thisWeekStart = daysAgo(6);
    const lastWeekStart = daysAgo(13);
    const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
    const customersThisWeek = allCustomers.filter((c) => inRange(c.created_at.split("T")[0], thisWeekStart, todayStr)).length;
    const customersLastWeek = allCustomers.filter((c) => inRange(c.created_at.split("T")[0], lastWeekStart, daysAgo(7))).length;
    const merchantsThisWeek = allMerchants.filter((m) => inRange(m.created_at.split("T")[0], thisWeekStart, todayStr)).length;
    const merchantsLastWeek = allMerchants.filter((m) => inRange(m.created_at.split("T")[0], lastWeekStart, daysAgo(7))).length;

    // Transaction type breakdown
    const txByType: Record<string, number> = {};
    for (const tx of allTx) { txByType[tx.transaction_type] = (txByType[tx.transaction_type] || 0) + 1; }

    // Top merchants by activity
    const merchantActivity: Record<string, number> = {};
    for (const tx of allTx) { merchantActivity[tx.merchant_id] = (merchantActivity[tx.merchant_id] || 0) + 1; }
    const topMerchants = Object.entries(merchantActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, txCount]) => ({ id, name: merchantMap.get(id)?.business_name || "Unknown", transactions: txCount, cardHolders: merchantStats[id]?.cardHolders || 0, stamps: merchantStats[id]?.totalStampsEarned || 0 }));

    // Engagement metrics
    const activeCustomerIds = new Set(allCards.map((c) => c.customer_id));
    const customersWithMultipleCards = Object.values(
      allCards.reduce((acc: Record<string, number>, c) => { acc[c.customer_id] = (acc[c.customer_id] || 0) + 1; return acc; }, {})
    ).filter((n) => n > 1).length;

    const avgStampsPerCard = allCards.length > 0 ? Math.round((allCards.reduce((s: number, c: any) => s + (c.total_stamps_earned || 0), 0) / allCards.length) * 10) / 10 : 0;
    const redemptionRate = allRewards.length > 0 ? Math.round((allRewards.filter((r: any) => r.is_used).length / allRewards.length) * 100) : 0;
    const activeMerchants = allMerchants.filter((m) => m.is_active).length;
    const merchantsWithLocation = allMerchants.filter((m) => m.latitude && m.longitude).length;

    // Pending rewards
    const pendingRewards = allRewards.filter((r: any) => !r.is_used).length;
    const claimedRewards = allRewards.filter((r: any) => r.is_used).length;

    const analytics = {
      customerGrowth,
      merchantGrowth,
      transactionActivity,
      rewardActivity,
      customersThisWeek,
      customersLastWeek,
      merchantsThisWeek,
      merchantsLastWeek,
      txByType,
      topMerchants,
      engagement: {
        activeCustomers: activeCustomerIds.size,
        customersWithMultipleCards,
        avgStampsPerCard,
        redemptionRate,
        activeMerchants,
        merchantsWithLocation,
        pendingRewards,
        claimedRewards,
        totalCards: allCards.length,
      },
    };

    return NextResponse.json({
      stats,
      customers: customers || [],
      merchants: merchants || [],
      transactions: enrich(transactions || []),
      rewards: enrich(rewards || []),
      merchantStats,
      analytics,
      supportMessages: supportMessages || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { type, id } = await req.json();

    if (type === "customer") {
      // Delete related data first
      const { data: cards } = await supabaseAdmin.from("loyalty_cards").select("id").eq("customer_id", id);
      const cardIds = (cards || []).map((c) => c.id);
      if (cardIds.length > 0) {
        await supabaseAdmin.from("stamps").delete().in("loyalty_card_id", cardIds);
        await supabaseAdmin.from("redeemed_rewards").delete().eq("customer_id", id);
        await supabaseAdmin.from("transactions").delete().eq("customer_id", id);
        await supabaseAdmin.from("loyalty_cards").delete().eq("customer_id", id);
      }
      await supabaseAdmin.from("customer_qr_codes").delete().eq("customer_id", id);
      await supabaseAdmin.from("user_locations").delete().eq("customer_id", id);
      await supabaseAdmin.from("store_visits").delete().eq("customer_id", id);
      const { error } = await supabaseAdmin.from("customers").delete().eq("id", id);
      if (error) throw error;
    } else if (type === "merchant") {
      // Delete related data first
      const { data: cards } = await supabaseAdmin.from("loyalty_cards").select("id").eq("merchant_id", id);
      const cardIds = (cards || []).map((c) => c.id);
      if (cardIds.length > 0) {
        await supabaseAdmin.from("stamps").delete().in("loyalty_card_id", cardIds);
      }
      await supabaseAdmin.from("redeemed_rewards").delete().eq("merchant_id", id);
      await supabaseAdmin.from("transactions").delete().eq("merchant_id", id);
      await supabaseAdmin.from("loyalty_cards").delete().eq("merchant_id", id);
      await supabaseAdmin.from("stamps").delete().eq("merchant_id", id);
      await supabaseAdmin.from("stamp_settings").delete().eq("merchant_id", id);
      await supabaseAdmin.from("merchant_announcements").delete().eq("merchant_id", id);
      await supabaseAdmin.from("merchant_qr_codes").delete().eq("merchant_id", id);
      await supabaseAdmin.from("store_visits").delete().eq("merchant_id", id);
      const { error } = await supabaseAdmin.from("merchants").delete().eq("id", id);
      if (error) throw error;
    } else if (type === "support_message") {
      const { error } = await supabaseAdmin.from("support_messages").delete().eq("id", id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { type, id, data } = await req.json();

    if (type === "customer") {
      const { error } = await supabaseAdmin.from("customers").update(data).eq("id", id);
      if (error) throw error;
    } else if (type === "merchant") {
      const { error } = await supabaseAdmin.from("merchants").update(data).eq("id", id);
      if (error) throw error;
    } else if (type === "support_message") {
      const { error } = await supabaseAdmin.from("support_messages").update(data).eq("id", id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
