"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "@/lib/theme";

type Stats = { totalCustomers: number; totalMerchants: number; totalLoyaltyCards: number; totalStampsIssued: number; totalRewardsRedeemed: number; totalAnnouncements: number; totalTransactions: number };
type Customer = { id: string; email: string; full_name: string | null; username: string; created_at: string };
type Merchant = { id: string; owner_email: string; business_name: string; address: string | null; city: string | null; is_active: boolean; created_at: string; phone_number: string | null; latitude: number | null; longitude: number | null; logo_url: string | null };
type Transaction = { id: string; merchant_id: string; transaction_type: string; stamp_count_after: number | null; notes: string | null; created_at: string; merchants: any; customers: any };
type Reward = { id: string; merchant_id: string; reward_code: string; stamps_used: number; is_used: boolean; used_at: string | null; created_at: string; merchants: any; customers: any };
type Tab = "overview" | "map" | "customers" | "merchants" | "rewards";

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("stampworth_admin")) { router.push("/"); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data");
      const d = await res.json();
      setStats(d.stats); setCustomers(d.customers || []); setMerchants(d.merchants || []); setTransactions(d.transactions || []); setRewards(d.rewards || []);
    } catch {}
    setLoading(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  const merchantTx = selectedMerchant ? transactions.filter((t) => t.merchant_id === selectedMerchant.id) : [];
  const merchantRewards = selectedMerchant ? rewards.filter((r) => r.merchant_id === selectedMerchant.id) : [];
  const merchantsWithLocation = merchants.filter((m) => m.latitude && m.longitude);

  const navItems: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "map", label: "Store Map" },
    { key: "customers", label: "Customers" },
    { key: "merchants", label: "Businesses" },
    { key: "rewards", label: "Rewards" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-10">
        <div className="px-5 py-5 flex items-center gap-3">
          <Image src="/logo.png" alt="Stampworth" width={28} height={28} />
          <div>
            <p className="text-[13px] font-bold text-[#2F4366] dark:text-[#7DA2D4] leading-tight">Stampworth</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">Admin Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-1">
          {navItems.map((n) => (
            <button key={n.key} onClick={() => { setTab(n.key); setSelectedMerchant(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-colors ${tab === n.key ? "bg-[#2F4366] dark:bg-[#7DA2D4] text-white dark:text-gray-900" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <button onClick={toggle} className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
            {theme === "light" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button onClick={load} className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Refresh</button>
          <button onClick={() => { localStorage.removeItem("stampworth_admin"); router.push("/"); }} className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === "overview" && stats && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Overview</h2>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <StatCard label="Customers" value={stats.totalCustomers} />
                  <StatCard label="Businesses" value={stats.totalMerchants} />
                  <StatCard label="Loyalty Cards" value={stats.totalLoyaltyCards} />
                  <StatCard label="Stamps" value={stats.totalStampsIssued} />
                  <StatCard label="Rewards" value={stats.totalRewardsRedeemed} />
                  <StatCard label="Announcements" value={stats.totalAnnouncements} />
                  <StatCard label="Transactions" value={stats.totalTransactions} />
                </div>
                <p className="text-[13px] font-semibold text-[#2F4366] dark:text-[#7DA2D4] mb-3">Recent Activity</p>
                <Table heads={["Type", "Customer", "Business", "Date"]}>
                  {transactions.slice(0, 8).map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2.5"><TypeBadge type={tx.transaction_type} /></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{tx.customers?.full_name || tx.customers?.email || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{tx.merchants?.business_name || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px]">{fmt(tx.created_at)}</td>
                    </tr>
                  ))}
                </Table>
              </>
            )}

            {/* MAP */}
            {tab === "map" && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Store Locations</h2>
                <StoreMap merchants={merchantsWithLocation} onSelect={(m) => { setSelectedMerchant(m); setTab("merchants"); }} />
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-3">{merchantsWithLocation.length} of {merchants.length} stores have set their location</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {merchantsWithLocation.map((m) => (
                    <button key={m.id} onClick={() => { setSelectedMerchant(m); setTab("merchants"); }} className="text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-[#2F4366]/30 dark:hover:border-[#7DA2D4]/30 transition-colors">
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{m.business_name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{[m.address, m.city].filter(Boolean).join(", ") || "No address"}</p>
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{m.latitude?.toFixed(5)}, {m.longitude?.toFixed(5)}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* CUSTOMERS */}
            {tab === "customers" && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Customers <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({customers.length})</span></h2>
                <Table heads={["#", "Name", "Username", "Email", "Registered"]}>
                  {customers.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{c.full_name || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">@{c.username}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{c.email}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px]">{fmt(c.created_at)}</td>
                    </tr>
                  ))}
                </Table>
                {customers.length === 0 && <Empty />}
              </>
            )}

            {/* MERCHANTS */}
            {tab === "merchants" && !selectedMerchant && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Businesses <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({merchants.length})</span></h2>
                <Table heads={["#", "Business", "Email", "Address", "Phone", "Status", "Registered"]}>
                  {merchants.map((m, i) => (
                    <tr key={m.id} onClick={() => setSelectedMerchant(m)} className="border-b border-gray-50 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 cursor-pointer">
                      <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-[#2F4366] dark:text-[#7DA2D4]">{m.business_name}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{m.owner_email}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] max-w-[160px] truncate">{[m.address, m.city].filter(Boolean).join(", ") || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px]">{m.phone_number || "-"}</td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${m.is_active ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>{m.is_active ? "Active" : "Inactive"}</span></td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px]">{fmt(m.created_at)}</td>
                    </tr>
                  ))}
                </Table>
                {merchants.length === 0 && <Empty />}
              </>
            )}

            {/* MERCHANT DETAIL */}
            {tab === "merchants" && selectedMerchant && (
              <>
                <button onClick={() => setSelectedMerchant(null)} className="text-[13px] text-gray-400 dark:text-gray-500 hover:text-[#2F4366] dark:hover:text-[#7DA2D4] mb-4 flex items-center gap-1">
                  ← Back to Businesses
                </button>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2F4366] dark:bg-[#7DA2D4] flex items-center justify-center text-white dark:text-gray-900 text-lg font-bold">
                      {selectedMerchant.business_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4]">{selectedMerchant.business_name}</h3>
                      <p className="text-[12px] text-gray-400 dark:text-gray-500">{selectedMerchant.owner_email}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[11px] font-semibold ${selectedMerchant.is_active ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>
                      {selectedMerchant.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-[12px]">
                    <div><p className="text-gray-400 dark:text-gray-500">Address</p><p className="text-gray-700 dark:text-gray-300 mt-0.5">{[selectedMerchant.address, selectedMerchant.city].filter(Boolean).join(", ") || "-"}</p></div>
                    <div><p className="text-gray-400 dark:text-gray-500">Phone</p><p className="text-gray-700 dark:text-gray-300 mt-0.5">{selectedMerchant.phone_number || "-"}</p></div>
                    <div><p className="text-gray-400 dark:text-gray-500">Location</p><p className="text-gray-700 dark:text-gray-300 mt-0.5">{selectedMerchant.latitude ? `${selectedMerchant.latitude.toFixed(5)}, ${selectedMerchant.longitude?.toFixed(5)}` : "Not set"}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <StatCard label="Transactions" value={merchantTx.length} />
                  <StatCard label="Rewards" value={merchantRewards.length} />
                  <StatCard label="Stamps Earned" value={merchantTx.filter((t) => t.transaction_type === "STAMP_EARNED").length} />
                </div>

                <p className="text-[13px] font-semibold text-[#2F4366] dark:text-[#7DA2D4] mb-3">Transactions</p>
                <Table heads={["Type", "Customer", "Stamps", "Notes", "Date"]}>
                  {merchantTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="px-4 py-2.5"><TypeBadge type={tx.transaction_type} /></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{tx.customers?.full_name || tx.customers?.email || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{tx.stamp_count_after ?? "-"}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] max-w-[200px] truncate">{tx.notes || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(tx.created_at)}</td>
                    </tr>
                  ))}
                </Table>
                {merchantTx.length === 0 && <Empty />}

                {merchantRewards.length > 0 && (
                  <>
                    <p className="text-[13px] font-semibold text-[#2F4366] dark:text-[#7DA2D4] mb-3 mt-6">Rewards</p>
                    <Table heads={["Code", "Customer", "Stamps", "Status", "Earned", "Used"]}>
                      {merchantRewards.map((r: any) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">{r.reward_code}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r.customers?.full_name || r.customers?.email || "-"}</td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{r.stamps_used}</td>
                          <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.is_used ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>{r.is_used ? "Claimed" : "Pending"}</span></td>
                          <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(r.created_at)}</td>
                          <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{r.used_at ? fmt(r.used_at) : "-"}</td>
                        </tr>
                      ))}
                    </Table>
                  </>
                )}
              </>
            )}

            {/* REWARDS */}
            {tab === "rewards" && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">All Rewards <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({rewards.length})</span></h2>
                <Table heads={["Code", "Customer", "Business", "Stamps", "Status", "Earned", "Used"]}>
                  {rewards.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">{r.reward_code}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r.customers?.full_name || r.customers?.email || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r.merchants?.business_name || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{r.stamps_used}</td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.is_used ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>{r.is_used ? "Claimed" : "Pending"}</span></td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{r.used_at ? fmt(r.used_at) : "-"}</td>
                    </tr>
                  ))}
                </Table>
                {rewards.length === 0 && <Empty />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#2F4366] dark:text-[#7DA2D4] mt-1">{value}</p>
    </div>
  );
}

function Table({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {heads.map((h) => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = {
    STAMP_EARNED: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400",
    STAMP_REMOVED: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
    REWARD_STORED: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
    REWARD_REDEEMED: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${s[type] || "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{type.replace(/_/g, " ")}</span>;
}

function Empty() {
  return <p className="text-center text-gray-400 dark:text-gray-500 text-[12px] py-10">No data yet</p>;
}

function StoreMap({ merchants, onSelect }: { merchants: Merchant[]; onSelect: (m: Merchant) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const mgl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");

      if (cancelled || !mapContainer.current) return;

      const center: [number, number] = merchants.length > 0
        ? [merchants[0].longitude!, merchants[0].latitude!]
        : [120.9842, 14.5995];

      const map = new mgl.Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center,
        zoom: 12,
      });

      map.addControl(new mgl.NavigationControl(), "top-right");

      map.on("load", () => {
        merchants.forEach((m) => {
          if (!m.latitude || !m.longitude) return;

          const el = document.createElement("div");
          el.style.cssText = "width:32px;height:32px;border-radius:50%;background:#2F4366;border:3px solid #fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
          el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>';
          el.title = m.business_name;

          const popup = new mgl.Popup({ offset: 20, closeButton: false }).setHTML(
            `<div style="font-family:system-ui;padding:4px 0"><strong style="color:#2F4366">${m.business_name}</strong><br/><span style="color:#888;font-size:11px">${[m.address, m.city].filter(Boolean).join(", ") || "No address"}</span></div>`
          );

          new mgl.Marker({ element: el })
            .setLngLat([m.longitude, m.latitude])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("click", () => onSelect(m));
        });

        if (merchants.length > 1) {
          const bounds = new mgl.LngLatBounds();
          merchants.forEach((m) => { if (m.latitude && m.longitude) bounds.extend([m.longitude, m.latitude]); });
          map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
        }
      });

      mapRef.current = map;
      setReady(true);
    })();

    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [merchants]);

  return (
    <div ref={mapContainer} className="w-full rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden" style={{ height: 480 }} />
  );
}
