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

    return NextResponse.json({
      stats,
      customers: customers || [],
      merchants: merchants || [],
      transactions: enrich(transactions || []),
      rewards: enrich(rewards || []),
      merchantStats,
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
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
