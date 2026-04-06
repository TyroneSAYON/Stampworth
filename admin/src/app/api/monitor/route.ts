import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://stampworth-app-uv2qi.ondigitalocean.app";

async function checkService(name: string, url: string, timeout = 8000, headers?: Record<string, string>): Promise<{ name: string; status: "up" | "down" | "slow"; latency: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store", headers });
    clearTimeout(timer);
    const latency = Date.now() - start;
    if (!res.ok) return { name, status: "down", latency, error: `HTTP ${res.status}` };
    return { name, status: latency > 3000 ? "slow" : "up", latency };
  } catch (e: any) {
    return { name, status: "down", latency: Date.now() - start, error: e.message || "Connection failed" };
  }
}

export async function GET() {
  try {
    // Check services in parallel
    const [backend, supabaseHealth] = await Promise.all([
      checkService("Backend API", `${BACKEND_URL}/api/health`),
      checkService("Supabase", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/customers?select=id&limit=1`, 8000, { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}` }),
    ]);

    // Admin dashboard is always up if this endpoint responds
    const admin = { name: "Admin Dashboard", status: "up" as const, latency: 0 };

    // Database check via query
    const dbStart = Date.now();
    const { error: dbError } = await supabaseAdmin.from("customers").select("id", { count: "exact", head: true });
    const dbLatency = Date.now() - dbStart;
    const database = { name: "Database", status: dbError ? "down" as const : dbLatency > 3000 ? "slow" as const : "up" as const, latency: dbLatency, error: dbError?.message };

    // Supabase Realtime check
    const realtimeStart = Date.now();
    let realtime: { name: string; status: "up" | "down" | "slow"; latency: number; error?: string } = { name: "Realtime", status: "up", latency: 0 };
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/websocket?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}&vsn=1.0.0`, { method: "GET", cache: "no-store" });
      realtime.latency = Date.now() - realtimeStart;
      realtime.status = realtime.latency > 3000 ? "slow" : "up";
    } catch (e: any) {
      realtime = { name: "Realtime", status: "down", latency: Date.now() - realtimeStart, error: e.message };
    }

    // Auth check
    const authStart = Date.now();
    let auth: { name: string; status: "up" | "down" | "slow"; latency: number; error?: string } = { name: "Auth Service", status: "up", latency: 0 };
    try {
      const authRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
        cache: "no-store",
      });
      auth.latency = Date.now() - authStart;
      auth.status = authRes.ok ? (auth.latency > 3000 ? "slow" : "up") : "down";
      if (!authRes.ok) auth.error = `HTTP ${authRes.status}`;
    } catch (e: any) {
      auth = { name: "Auth Service", status: "down", latency: Date.now() - authStart, error: e.message };
    }

    // Database usage estimates
    const [custCount, merchCount, cardCount, stampCount, txCount, rewardCount] = await Promise.all([
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("merchants").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("loyalty_cards").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("stamps").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("redeemed_rewards").select("id", { count: "exact", head: true }),
    ]);

    const totalRows = (custCount.count || 0) + (merchCount.count || 0) + (cardCount.count || 0) + (stampCount.count || 0) + (txCount.count || 0) + (rewardCount.count || 0);

    const services = [admin, backend, supabaseHealth, database, realtime, auth];
    const allUp = services.every((s) => s.status === "up");
    const anyDown = services.some((s) => s.status === "down");

    return NextResponse.json({
      overall: anyDown ? "degraded" : allUp ? "operational" : "slow",
      services,
      database: {
        tables: {
          customers: custCount.count || 0,
          merchants: merchCount.count || 0,
          loyalty_cards: cardCount.count || 0,
          stamps: stampCount.count || 0,
          transactions: txCount.count || 0,
          redeemed_rewards: rewardCount.count || 0,
        },
        totalRows,
        estimatedStorageMB: Math.round(totalRows * 0.5 / 1000 * 10) / 10, // rough estimate
        freeStorageLimitMB: 500,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ overall: "error", error: error.message, checkedAt: new Date().toISOString() }, { status: 500 });
  }
}
