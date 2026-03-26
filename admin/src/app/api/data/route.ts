import { NextResponse } from "next/server";
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

    const { data: customers } = await supabaseAdmin.from("customers").select("id, email, full_name, username, created_at").order("created_at", { ascending: false }).limit(500);
    const { data: merchants } = await supabaseAdmin.from("merchants").select("id, owner_email, business_name, address, city, is_active, created_at, phone_number, latitude, longitude, logo_url").order("created_at", { ascending: false }).limit(500);
    const { data: transactions } = await supabaseAdmin.from("transactions").select("id, merchant_id, customer_id, transaction_type, stamp_count_after, notes, created_at").order("created_at", { ascending: false }).limit(500);
    const { data: rewards } = await supabaseAdmin.from("redeemed_rewards").select("id, merchant_id, customer_id, reward_code, stamps_used, is_used, used_at, created_at").order("created_at", { ascending: false }).limit(500);

    // Build lookup maps
    const merchantMap = new Map((merchants || []).map((m) => [m.id, m]));
    const customerMap = new Map((customers || []).map((c) => [c.id, c]));

    const enrich = (items: any[]) => items.map((item) => ({
      ...item,
      merchants: merchantMap.get(item.merchant_id) || null,
      customers: customerMap.get(item.customer_id) || null,
    }));

    return NextResponse.json({
      stats,
      customers: customers || [],
      merchants: merchants || [],
      transactions: enrich(transactions || []),
      rewards: enrich(rewards || []),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
