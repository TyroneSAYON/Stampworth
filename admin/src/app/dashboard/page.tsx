"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "@/lib/theme";

type Stats = { totalCustomers: number; totalMerchants: number; totalLoyaltyCards: number; totalStampsIssued: number; totalRewardsRedeemed: number; totalAnnouncements: number; totalTransactions: number };
type Customer = { id: string; email: string; full_name: string | null; username: string; phone_number: string | null; created_at: string };
type Merchant = { id: string; auth_id: string | null; owner_email: string; business_name: string; address: string | null; city: string | null; is_active: boolean; created_at: string; phone_number: string | null; latitude: number | null; longitude: number | null; logo_url: string | null };
type MerchantStats = { cardHolders: number; totalStampsEarned: number; totalRewardsRedeemed: number; stampsPerRedemption: number; cardColor: string; stampIcon: string };
type Transaction = { id: string; merchant_id: string; transaction_type: string; stamp_count_after: number | null; notes: string | null; created_at: string; merchants: any; customers: any };
type Reward = { id: string; merchant_id: string; reward_code: string; stamps_used: number; is_used: boolean; used_at: string | null; created_at: string; merchants: any; customers: any };
type Tab = "overview" | "map" | "customers" | "merchants" | "rewards";

// All merchants are on Beta during testing
const SUBSCRIPTION_PLAN = "Beta (Free)";
const SUBSCRIPTION_STATUS = "active";

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantStatsMap, setMerchantStatsMap] = useState<Record<string, MerchantStats>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Edit/Delete state
  const [editModal, setEditModal] = useState<{ type: "customer" | "merchant"; item: any } | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "customer" | "merchant"; item: any } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("stampworth_admin")) { router.push("/"); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data");
      const d = await res.json();
      setStats(d.stats); setCustomers(d.customers || []); setMerchants(d.merchants || []); setTransactions(d.transactions || []); setRewards(d.rewards || []); setMerchantStatsMap(d.merchantStats || {});
    } catch {}
    setLoading(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const switchTab = (t: Tab) => { setTab(t); setSelectedMerchant(null); setSidebarOpen(false); };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: deleteConfirm.type, id: deleteConfirm.item.id }) });
      const d = await res.json();
      if (d.success) {
        if (deleteConfirm.type === "customer") setCustomers((prev) => prev.filter((c) => c.id !== deleteConfirm.item.id));
        else { setMerchants((prev) => prev.filter((m) => m.id !== deleteConfirm.item.id)); if (selectedMerchant?.id === deleteConfirm.item.id) setSelectedMerchant(null); }
        setDeleteConfirm(null);
        load();
      } else alert("Delete failed: " + (d.error || "Unknown error"));
    } catch (e: any) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: editModal.type, id: editModal.item.id, data: editForm }) });
      const d = await res.json();
      if (d.success) { setEditModal(null); load(); }
      else alert("Save failed: " + (d.error || "Unknown error"));
    } catch (e: any) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const openEditCustomer = (c: Customer) => {
    setEditForm({ full_name: c.full_name || "", username: c.username || "", email: c.email || "", phone_number: c.phone_number || "" });
    setEditModal({ type: "customer", item: c });
  };

  const openEditMerchant = (m: Merchant) => {
    setEditForm({ business_name: m.business_name || "", owner_email: m.owner_email || "", phone_number: m.phone_number || "", address: m.address || "", city: m.city || "", is_active: m.is_active ? "true" : "false" });
    setEditModal({ type: "merchant", item: m });
  };

  const merchantTx = selectedMerchant ? transactions.filter((t) => t.merchant_id === selectedMerchant.id) : [];
  const merchantRewards = selectedMerchant ? rewards.filter((r) => r.merchant_id === selectedMerchant.id) : [];
  const merchantsWithLocation = merchants.filter((m) => m.latitude && m.longitude);

  const navItems: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
    { key: "map", label: "Store Map", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
    { key: "customers", label: "Customers", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { key: "merchants", label: "Businesses", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { key: "rewards", label: "Rewards", icon: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-gray-950">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 z-30">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Image src="/logo.png" alt="Stampworth" width={24} height={24} />
          <p className="text-[13px] font-bold text-[#2F4366] dark:text-[#7DA2D4]">Stampworth</p>
        </div>
      </div>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-40 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="px-5 py-5 flex items-center gap-3">
          <Image src="/logo.png" alt="Stampworth" width={28} height={28} />
          <div><p className="text-[13px] font-bold text-[#2F4366] dark:text-[#7DA2D4] leading-tight">Stampworth</p><p className="text-[9px] text-gray-400 dark:text-gray-500">Admin Dashboard</p></div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <nav className="flex-1 px-3 py-1">
          {navItems.map((n) => (
            <button key={n.key} onClick={() => switchTab(n.key)} className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium mb-0.5 transition-colors flex items-center gap-2.5 ${tab === n.key ? "bg-[#2F4366] dark:bg-[#7DA2D4] text-white dark:text-gray-900" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon}/></svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <button onClick={toggle} className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
            {theme === "light" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button onClick={load} className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Refresh</button>
          <button onClick={() => { localStorage.removeItem("stampworth_admin"); router.push("/"); }} className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-56 pt-14 lg:pt-0 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === "overview" && stats && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
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
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{tx.merchants?.business_name || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(tx.created_at)}</td>
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
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {merchantsWithLocation.map((m) => (
                    <button key={m.id} onClick={() => { setSelectedMerchant(m); setTab("merchants"); }} className="text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-[#2F4366]/30 dark:hover:border-[#7DA2D4]/30 transition-colors">
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{m.business_name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{[m.address, m.city].filter(Boolean).join(", ") || "No address"}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* CUSTOMERS */}
            {tab === "customers" && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Customers <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({customers.length})</span></h2>
                <div className="sm:hidden space-y-2">
                  {customers.map((c, i) => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-[13px] text-gray-800 dark:text-gray-200">{c.full_name || "-"}</p>
                        <div className="flex gap-1">
                          <button onClick={() => openEditCustomer(c)} className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                          <button onClick={() => setDeleteConfirm({ type: "customer", item: c })} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
                        </div>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">@{c.username}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{c.email}</p>
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{fmt(c.created_at)}</p>
                    </div>
                  ))}
                  {customers.length === 0 && <Empty />}
                </div>
                <div className="hidden sm:block">
                  <Table heads={["#", "Name", "Username", "Email", "Registered", "Actions"]}>
                    {customers.map((c, i) => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{c.full_name || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">@{c.username}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{c.email}</td>
                        <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-[11px]">{fmt(c.created_at)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => openEditCustomer(c)} className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900">Edit</button>
                            <button onClick={() => setDeleteConfirm({ type: "customer", item: c })} className="px-2 py-1 rounded text-[10px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Table>
                  {customers.length === 0 && <Empty />}
                </div>
              </>
            )}

            {/* MERCHANTS LIST */}
            {tab === "merchants" && !selectedMerchant && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">Businesses <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({merchants.length})</span></h2>
                <div className="sm:hidden space-y-2">
                  {merchants.map((m) => {
                    const ms = merchantStatsMap[m.id];
                    return (
                      <div key={m.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <button onClick={() => setSelectedMerchant(m)} className="font-medium text-[13px] text-[#2F4366] dark:text-[#7DA2D4]">{m.business_name}</button>
                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${m.is_active ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>{m.is_active ? "Active" : "Inactive"}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{m.owner_email}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-semibold">{SUBSCRIPTION_PLAN}</span>
                          {ms && <span className="text-[10px] text-gray-400 dark:text-gray-500">{ms.cardHolders} holders · {ms.totalStampsEarned} stamps</span>}
                        </div>
                        <div className="flex gap-1 mt-3">
                          <button onClick={() => setSelectedMerchant(m)} className="flex-1 py-1.5 rounded text-[10px] font-semibold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-center">View</button>
                          <button onClick={() => openEditMerchant(m)} className="flex-1 py-1.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-center">Edit</button>
                          <button onClick={() => setDeleteConfirm({ type: "merchant", item: m })} className="flex-1 py-1.5 rounded text-[10px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-center">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                  {merchants.length === 0 && <Empty />}
                </div>
                <div className="hidden sm:block">
                  <Table heads={["#", "Business", "Email", "Plan", "Card Holders", "Stamps", "Status", "Actions"]}>
                    {merchants.map((m, i) => {
                      const ms = merchantStatsMap[m.id];
                      return (
                        <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-[#2F4366] dark:text-[#7DA2D4] cursor-pointer" onClick={() => setSelectedMerchant(m)}>{m.business_name}</td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{m.owner_email}</td>
                          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">{SUBSCRIPTION_PLAN}</span></td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{ms?.cardHolders ?? 0}</td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{ms?.totalStampsEarned ?? 0}</td>
                          <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${m.is_active ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>{m.is_active ? "Active" : "Inactive"}</span></td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              <button onClick={() => setSelectedMerchant(m)} className="px-2 py-1 rounded text-[10px] font-semibold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">View</button>
                              <button onClick={() => openEditMerchant(m)} className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900">Edit</button>
                              <button onClick={() => setDeleteConfirm({ type: "merchant", item: m })} className="px-2 py-1 rounded text-[10px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                  {merchants.length === 0 && <Empty />}
                </div>
              </>
            )}

            {/* MERCHANT DETAIL */}
            {tab === "merchants" && selectedMerchant && (() => {
              const ms = merchantStatsMap[selectedMerchant.id];
              return (
                <>
                  <button onClick={() => setSelectedMerchant(null)} className="text-[13px] text-gray-400 dark:text-gray-500 hover:text-[#2F4366] dark:hover:text-[#7DA2D4] mb-4 flex items-center gap-1">← Back to Businesses</button>

                  {/* Merchant header */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white dark:text-gray-900 text-lg font-bold shrink-0" style={{ backgroundColor: ms?.cardColor || "#2F4366" }}>{selectedMerchant.business_name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] truncate">{selectedMerchant.business_name}</h3>
                          <p className="text-[12px] text-gray-400 dark:text-gray-500 truncate">{selectedMerchant.owner_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-semibold ${selectedMerchant.is_active ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>{selectedMerchant.is_active ? "Active" : "Inactive"}</span>
                        <button onClick={() => openEditMerchant(selectedMerchant)} className="px-3 py-1 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">Edit</button>
                        <button onClick={() => setDeleteConfirm({ type: "merchant", item: selectedMerchant })} className="px-3 py-1 rounded text-[11px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">Delete</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-[12px]">
                      <div><p className="text-gray-400 dark:text-gray-500">Address</p><p className="text-gray-700 dark:text-gray-300 mt-0.5">{[selectedMerchant.address, selectedMerchant.city].filter(Boolean).join(", ") || "-"}</p></div>
                      <div><p className="text-gray-400 dark:text-gray-500">Phone</p><p className="text-gray-700 dark:text-gray-300 mt-0.5">{selectedMerchant.phone_number || "-"}</p></div>
                      <div><p className="text-gray-400 dark:text-gray-500">Location</p><p className="text-gray-700 dark:text-gray-300 mt-0.5">{selectedMerchant.latitude ? `${selectedMerchant.latitude.toFixed(5)}, ${selectedMerchant.longitude?.toFixed(5)}` : "Not set"}</p></div>
                    </div>
                  </div>

                  {/* Subscription & Earnings */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 mb-4">
                    <p className="text-[13px] font-semibold text-[#2F4366] dark:text-[#7DA2D4] mb-3">Subscription & Earnings</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-medium text-purple-500 dark:text-purple-400 uppercase">Plan</p>
                        <p className="text-[14px] font-bold text-purple-700 dark:text-purple-300 mt-1">{SUBSCRIPTION_PLAN}</p>
                        <p className="text-[9px] text-purple-400 dark:text-purple-500 mt-0.5 capitalize">{SUBSCRIPTION_STATUS}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-medium text-blue-500 dark:text-blue-400 uppercase">Card Holders</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{ms?.cardHolders ?? 0}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-medium text-green-500 dark:text-green-400 uppercase">Stamps Earned</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">{ms?.totalStampsEarned ?? 0}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-medium text-amber-500 dark:text-amber-400 uppercase">Rewards Claimed</p>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{ms?.totalRewardsRedeemed ?? 0}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-[12px]">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase">Stamps / Redemption</p>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold mt-0.5">{ms?.stampsPerRedemption ?? 10}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase">Total Transactions</p>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold mt-0.5">{merchantTx.length}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase">Registered</p>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold mt-0.5">{fmt(selectedMerchant.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transactions */}
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
              );
            })()}

            {/* REWARDS */}
            {tab === "rewards" && (
              <>
                <h2 className="text-lg font-bold text-[#2F4366] dark:text-[#7DA2D4] mb-5">All Rewards <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({rewards.length})</span></h2>
                <div className="sm:hidden space-y-2">
                  {rewards.map((r: any) => (
                    <div key={r.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{r.reward_code}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.is_used ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>{r.is_used ? "Claimed" : "Pending"}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 dark:text-gray-400">{r.customers?.full_name || r.customers?.email || "-"}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{r.merchants?.business_name || "-"} · {r.stamps_used} stamps</p>
                    </div>
                  ))}
                  {rewards.length === 0 && <Empty />}
                </div>
                <div className="hidden sm:block">
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
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-[#2F4366] dark:text-[#7DA2D4]">Edit {editModal.type === "customer" ? "Customer" : "Business"}</h3>
              <button onClick={() => setEditModal(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="space-y-3">
              {Object.entries(editForm).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{key.replace(/_/g, " ")}</label>
                  {key === "is_active" ? (
                    <select value={val} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <input value={val} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#2F4366] dark:focus:border-[#7DA2D4]" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditModal(null)} className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-[13px] font-semibold text-gray-500 dark:text-gray-400">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 h-10 rounded-lg bg-[#2F4366] dark:bg-[#7DA2D4] text-white dark:text-gray-900 text-[13px] font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 mx-auto flex items-center justify-center mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">Delete {deleteConfirm.type === "customer" ? "Customer" : "Business"}?</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-semibold">{deleteConfirm.type === "customer" ? (deleteConfirm.item.full_name || deleteConfirm.item.username) : deleteConfirm.item.business_name}</span>
              </p>
              <p className="text-[11px] text-red-500 dark:text-red-400">This will permanently delete all related data (cards, stamps, rewards, transactions). This action cannot be undone.</p>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-[13px] font-semibold text-gray-500 dark:text-gray-400">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-500 text-white text-[13px] font-semibold disabled:opacity-50">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-[#2F4366] dark:text-[#7DA2D4] mt-1">{value}</p>
    </div>
  );
}

function Table({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
      <table className="w-full text-[12px] min-w-[500px]">
        <thead><tr className="border-b border-gray-100 dark:border-gray-800">{heads.map((h) => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = { STAMP_EARNED: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400", STAMP_REMOVED: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400", REWARD_STORED: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400", REWARD_REDEEMED: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400" };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${s[type] || "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{type.replace(/_/g, " ")}</span>;
}

function Empty() { return <p className="text-center text-gray-400 dark:text-gray-500 text-[12px] py-10">No data yet</p>; }

function StoreMap({ merchants, onSelect }: { merchants: Merchant[]; onSelect: (m: Merchant) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const mgl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !mapContainer.current) return;
      const center: [number, number] = merchants.length > 0 ? [merchants[0].longitude!, merchants[0].latitude!] : [120.9842, 14.5995];
      const map = new mgl.Map({ container: mapContainer.current, style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", center, zoom: 12 });
      map.addControl(new mgl.NavigationControl(), "top-right");
      map.on("load", () => {
        merchants.forEach((m) => {
          if (!m.latitude || !m.longitude) return;
          const el = document.createElement("div");
          el.style.cssText = "width:32px;height:32px;border-radius:50%;background:#2F4366;border:3px solid #fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
          el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>';
          el.title = m.business_name;
          const popup = new mgl.Popup({ offset: 20, closeButton: false }).setHTML(`<div style="font-family:system-ui;padding:4px 0"><strong style="color:#2F4366">${m.business_name}</strong><br/><span style="color:#888;font-size:11px">${[m.address, m.city].filter(Boolean).join(", ") || "No address"}</span></div>`);
          new mgl.Marker({ element: el }).setLngLat([m.longitude, m.latitude]).setPopup(popup).addTo(map);
          el.addEventListener("click", () => onSelect(m));
        });
        if (merchants.length > 1) { const bounds = new mgl.LngLatBounds(); merchants.forEach((m) => { if (m.latitude && m.longitude) bounds.extend([m.longitude, m.latitude]); }); map.fitBounds(bounds, { padding: 60, maxZoom: 14 }); }
      });
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [merchants]);

  return <div ref={mapContainer} className="w-full rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden" style={{ height: "clamp(280px, 50vw, 480px)" }} />;
}
