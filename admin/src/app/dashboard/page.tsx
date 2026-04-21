"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Stats = { totalCustomers: number; totalMerchants: number; totalLoyaltyCards: number; totalStampsIssued: number; totalRewardsRedeemed: number; totalAnnouncements: number; totalTransactions: number };
type Customer = { id: string; email: string; full_name: string | null; username: string; phone_number: string | null; created_at: string };
type Merchant = { id: string; auth_id: string | null; owner_email: string; business_name: string; address: string | null; city: string | null; is_active: boolean; created_at: string; phone_number: string | null; latitude: number | null; longitude: number | null; logo_url: string | null };
type MerchantStats = { cardHolders: number; totalStampsEarned: number; totalRewardsRedeemed: number; stampsPerRedemption: number; cardColor: string; stampIcon: string };
type Transaction = { id: string; merchant_id: string; transaction_type: string; stamp_count_after: number | null; notes: string | null; created_at: string; merchants: any; customers: any };
type Reward = { id: string; merchant_id: string; reward_code: string; stamps_used: number; is_used: boolean; used_at: string | null; created_at: string; merchants: any; customers: any };
type Analytics = {
  customerGrowth: { date: string; count: number }[];
  merchantGrowth: { date: string; count: number }[];
  transactionActivity: { date: string; count: number }[];
  rewardActivity: { date: string; count: number }[];
  customersThisWeek: number; customersLastWeek: number;
  merchantsThisWeek: number; merchantsLastWeek: number;
  txByType: Record<string, number>;
  topMerchants: { id: string; name: string; transactions: number; cardHolders: number; stamps: number }[];
  engagement: { activeCustomers: number; customersWithMultipleCards: number; avgStampsPerCard: number; redemptionRate: number; activeMerchants: number; merchantsWithLocation: number; pendingRewards: number; claimedRewards: number; totalCards: number };
};
type MonitorData = {
  overall: "operational" | "degraded" | "slow" | "error";
  services: { name: string; status: "up" | "down" | "slow"; latency: number; error?: string }[];
  database: { tables: Record<string, number>; totalRows: number; estimatedStorageMB: number; freeStorageLimitMB: number };
  checkedAt: string;
};
type SupportMessage = { id: string; sender_type: "customer" | "merchant"; sender_id: string | null; sender_email: string; sender_name: string | null; subject: string | null; message: string; is_read: boolean; is_replied: boolean; created_at: string };
type DevBroadcast = { id: string; title: string; message: string; target: "all" | "customers" | "merchants"; is_active: boolean; created_at: string };
type Tab = "overview" | "analytics" | "monitor" | "support" | "broadcast" | "map" | "customers" | "merchants" | "rewards";

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
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewedSnapshots, setViewedSnapshots] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("stampworth_viewed_snapshots") || "{}"); } catch { return {}; }
  });
  const [devBroadcasts, setDevBroadcasts] = useState<DevBroadcast[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "customers" | "merchants">("all");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Realtime indicator
  const [realtimeFlash, setRealtimeFlash] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Monitoring
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const loadMonitor = async () => {
    setMonitorLoading(true);
    try {
      const res = await fetch("/api/monitor", { cache: "no-store" });
      const d = await res.json();
      setMonitor(d);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {}
    setMonitorLoading(false);
  };

  // Auto-refresh monitoring every 30s when on monitor tab
  useEffect(() => {
    if (tab !== "monitor") return;
    loadMonitor();
    const interval = setInterval(loadMonitor, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  // Date filter (for businesses tab only) — "all" means no filter
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [showCalendar, setShowCalendar] = useState(false);

  const dateLabel = (d: string) => {
    if (d === "all") return "All Time";
    if (d === todayStr) return "Today";
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  // Generate calendar days for the month of selectedDate
  const calendarMonth = (() => {
    const dateForCal = selectedDate === "all" ? todayStr : selectedDate;
    const [y, m] = dateForCal.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const startDay = first.getDay();
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(startDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
    return { year: y, month: m, weeks };
  })();

  const calendarMonthLabel = new Date(calendarMonth.year, calendarMonth.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const shiftMonth = (dir: number) => {
    const dateForCal = selectedDate === "all" ? todayStr : selectedDate;
    const [y, m] = dateForCal.split("-").map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    const day = Math.min(Number(dateForCal.split("-")[2]), new Date(nd.getFullYear(), nd.getMonth() + 1, 0).getDate());
    setSelectedDate(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  };

  const pickDay = (day: number) => {
    const dateForCal = selectedDate === "all" ? todayStr : selectedDate;
    const [y, m] = dateForCal.split("-").map(Number);
    setSelectedDate(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setShowCalendar(false);
  };

  // Count records per day for calendar dots (businesses only)
  const dayHasRecords = (day: number) => {
    const ds = `${calendarMonth.year}-${String(calendarMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return merchants.some((m) => m.created_at.startsWith(ds));
  };

  // Edit/Delete state
  const [editModal, setEditModal] = useState<{ type: "customer" | "merchant"; item: any } | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "customer" | "merchant"; item: any } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced reload — collapses rapid-fire DB changes into a single fetch
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      load();
      // Flash the realtime indicator
      setRealtimeFlash(true);
      setTimeout(() => setRealtimeFlash(false), 2000);
    }, 800);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("stampworth_admin")) { router.push("/"); return; }
    load();

    // Realtime: subscribe to all key tables
    const reloadFn = () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/data");
          const d = await res.json();
          setStats(d.stats); setCustomers(d.customers || []); setMerchants(d.merchants || []); setTransactions(d.transactions || []); setRewards(d.rewards || []); setMerchantStatsMap(d.merchantStats || {}); setAnalytics(d.analytics || null); setSupportMessages(d.supportMessages || []); setDevBroadcasts(d.devBroadcasts || []);
          setLastUpdate(new Date().toLocaleTimeString());
          setRealtimeFlash(true);
          setTimeout(() => setRealtimeFlash(false), 2000);
        } catch {}
      }, 800);
    };

    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "merchants" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_cards" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "stamps" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "redeemed_rewards" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "merchant_announcements" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, reloadFn)
      .on("postgres_changes", { event: "*", schema: "public", table: "dev_broadcasts" }, reloadFn)
      .subscribe((status, err) => {
        console.log("Realtime:", status, err || "");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Retry after 5s
          setTimeout(() => { channel.subscribe(); }, 5000);
        }
      });

    // Fallback polling every 15s in case realtime doesn't connect
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/data");
        const d = await res.json();
        setStats(d.stats); setCustomers(d.customers || []); setMerchants(d.merchants || []); setTransactions(d.transactions || []); setRewards(d.rewards || []); setMerchantStatsMap(d.merchantStats || {}); setAnalytics(d.analytics || null); setSupportMessages(d.supportMessages || []); setDevBroadcasts(d.devBroadcasts || []);
        setLastUpdate(new Date().toLocaleTimeString());
      } catch {}
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  const load = async () => {
    setLoading((prev) => stats === null); // only show full loader on first load
    try {
      const res = await fetch("/api/data");
      const d = await res.json();
      setStats(d.stats); setCustomers(d.customers || []); setMerchants(d.merchants || []); setTransactions(d.transactions || []); setRewards(d.rewards || []); setMerchantStatsMap(d.merchantStats || {}); setAnalytics(d.analytics || null); setSupportMessages(d.supportMessages || []); setDevBroadcasts(d.devBroadcasts || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {}
    setLoading(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const markTabViewed = (t: Tab, counts: Record<string, number>) => {
    setViewedSnapshots((prev) => {
      const next = { ...prev, [t]: counts[t] ?? 0 };
      try { localStorage.setItem("stampworth_viewed_snapshots", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const switchTab = (t: Tab) => { setTab(t); setSelectedMerchant(null); setSidebarOpen(false); markTabViewed(t, badgeCounts); };

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

  // Notification badge counts per section
  const newCustomersToday = customers.filter((c) => c.created_at.startsWith(todayStr)).length;
  const newMerchantsToday = merchants.filter((m) => m.created_at.startsWith(todayStr)).length;
  const unreadSupport = supportMessages.filter((m) => !m.is_read).length;
  const pendingRewardsCount = rewards.filter((r) => !r.is_used).length;
  const merchantsNoLocation = merchants.length - merchantsWithLocation.length;
  const degradedServices = monitor?.services.filter((s) => s.status !== "up").length || 0;
  const inactiveMerchants = merchants.filter((m) => !m.is_active).length;
  const todayTransactions = transactions.filter((t) => t.created_at.startsWith(todayStr)).length;

  const activeBroadcasts = devBroadcasts.filter((b) => b.is_active).length;

  const badgeCounts: Record<Tab, number> = {
    overview: newCustomersToday + newMerchantsToday + todayTransactions,
    analytics: analytics?.customersThisWeek || 0,
    monitor: degradedServices,
    support: unreadSupport,
    broadcast: activeBroadcasts,
    map: merchantsNoLocation,
    customers: newCustomersToday,
    merchants: newMerchantsToday + inactiveMerchants,
    rewards: pendingRewardsCount,
  };

  const badgeColors: Record<Tab, string> = {
    overview: "bg-blue-500",
    analytics: "bg-indigo-500",
    monitor: degradedServices > 0 ? "bg-red-500" : "bg-green-500",
    support: "bg-orange-500",
    broadcast: "bg-teal-500",
    map: "bg-amber-500",
    customers: "bg-blue-500",
    merchants: inactiveMerchants > 0 ? "bg-red-500" : "bg-blue-500",
    rewards: "bg-purple-500",
  };

  const navIcons: Record<Tab, string> = {
    overview: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
    analytics: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    monitor: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    support: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
    broadcast: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    map: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
    customers: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    merchants: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    rewards: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  };
  const tabLabels: Record<Tab, string> = { overview: "Overview", analytics: "Analytics", monitor: "Monitoring", support: "Support Inbox", broadcast: "Broadcast", map: "Store Map", customers: "Customers", merchants: "Businesses", rewards: "Rewards" };
  const navSections: { label: string; items: Tab[] }[] = [
    { label: "Main", items: ["overview", "analytics"] },
    { label: "Management", items: ["customers", "merchants", "rewards"] },
    { label: "Operations", items: ["support", "broadcast", "map"] },
    { label: "System", items: ["monitor"] },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Mobile header — always dark */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 z-30">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Image src="/logo.png" alt="Stampworth" width={22} height={22} />
          <p className="text-[12px] font-semibold text-slate-200">Stampworth</p>
        </div>
      </div>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — always dark */}
      <aside className={`fixed left-0 top-0 bottom-0 w-56 bg-slate-900 flex flex-col z-40 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-slate-700/50">
          <Image src="/logo.png" alt="Stampworth" width={26} height={26} />
          <div><p className="text-[13px] font-bold text-white leading-tight">Stampworth</p><p className="text-[9px] text-slate-500 uppercase tracking-wider">Admin Panel</p></div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mb-3">
              <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">{section.label}</p>
              {section.items.map((key) => {
                const count = badgeCounts[key];
                const color = badgeColors[key];
                return (
                  <button key={key} onClick={() => switchTab(key)} className={`w-full text-left px-3 py-2 rounded text-[12px] font-medium mb-px transition-colors flex items-center gap-2.5 ${tab === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-75"><path d={navIcons[key]}/></svg>
                    <span className="flex-1">{tabLabels[key]}</span>
                    {count > 0 && count !== (viewedSnapshots[key] ?? -1) && (
                      <span className={`min-w-[18px] h-[18px] px-1 rounded text-[9px] font-bold text-white flex items-center justify-center ${tab === key ? "bg-white/20" : color}`}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-slate-700/50 space-y-px">
          <button onClick={toggle} className="w-full text-left px-3 py-1.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 flex items-center gap-2">
            {theme === "light" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button onClick={() => load()} className="w-full text-left px-3 py-1.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/60">Refresh</button>
          <button onClick={() => { localStorage.removeItem("stampworth_admin"); router.push("/"); }} className="w-full text-left px-3 py-1.5 rounded text-[11px] text-slate-500 hover:text-red-400 hover:bg-slate-800/60">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-56 pt-12 lg:pt-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-20 h-11 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-5">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-gray-400 dark:text-gray-500">Admin</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 dark:text-gray-600"><path d="M9 18l6-6-6-6"/></svg>
            <span className="text-gray-700 dark:text-gray-200 font-semibold">{tabLabels[tab]}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            {stats && <><span className="hidden sm:inline font-mono">{stats.totalCustomers} users</span><span className="hidden sm:inline">·</span><span className="hidden sm:inline font-mono">{stats.totalMerchants} stores</span></>}
            {lastUpdate && <span className="hidden md:inline font-mono text-gray-300 dark:text-gray-600">{lastUpdate}</span>}
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors duration-500 ${realtimeFlash ? "bg-green-100 dark:bg-green-900/30" : ""}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${realtimeFlash ? "bg-green-400 scale-125" : "bg-green-500"} animate-pulse transition-transform`} />
              <span className="hidden sm:inline">{realtimeFlash ? "Updated" : "Live"}</span>
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">Loading...</p></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === "overview" && stats && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Overview</p>
                {(newCustomersToday > 0 || newMerchantsToday > 0 || todayTransactions > 0 || unreadSupport > 0 || pendingRewardsCount > 0) && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {newCustomersToday > 0 && <NotifPill color="blue" icon="👤" text={`${newCustomersToday} new customer${newCustomersToday > 1 ? "s" : ""} today`} onClick={() => switchTab("customers")} />}
                    {newMerchantsToday > 0 && <NotifPill color="green" icon="🏪" text={`${newMerchantsToday} new business${newMerchantsToday > 1 ? "es" : ""} today`} onClick={() => switchTab("merchants")} />}
                    {todayTransactions > 0 && <NotifPill color="indigo" icon="⚡" text={`${todayTransactions} transaction${todayTransactions > 1 ? "s" : ""} today`} />}
                    {unreadSupport > 0 && <NotifPill color="orange" icon="💬" text={`${unreadSupport} unread message${unreadSupport > 1 ? "s" : ""}`} onClick={() => switchTab("support")} />}
                    {pendingRewardsCount > 0 && <NotifPill color="purple" icon="🎁" text={`${pendingRewardsCount} pending reward${pendingRewardsCount > 1 ? "s" : ""}`} onClick={() => switchTab("rewards")} />}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Customers" value={stats.totalCustomers} />
                  <StatCard label="Businesses" value={stats.totalMerchants} />
                  <StatCard label="Loyalty Cards" value={stats.totalLoyaltyCards} />
                  <StatCard label="Stamps" value={stats.totalStampsIssued} />
                  <StatCard label="Rewards" value={stats.totalRewardsRedeemed} />
                  <StatCard label="Announcements" value={stats.totalAnnouncements} />
                  <StatCard label="Transactions" value={stats.totalTransactions} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Recent Activity</p>
                <Table heads={["Type", "Customer", "Business", "Date"]}>
                  {transactions.slice(0, 8).map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2.5"><TypeBadge type={tx.transaction_type} /></td>
                      <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400">{tx.customers?.full_name || tx.customers?.email || "-"}</td>
                      <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400 hidden sm:table-cell">{tx.merchants?.business_name || "-"}</td>
                      <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(tx.created_at)}</td>
                    </tr>
                  ))}
                </Table>
              </>
            )}

            {/* ANALYTICS */}
            {tab === "analytics" && analytics && stats && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Analytics</h2>
                {(analytics.customersThisWeek > 0 || analytics.merchantsThisWeek > 0) && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {analytics.customersThisWeek > 0 && <NotifPill color="blue" icon="📈" text={`${analytics.customersThisWeek} new customer${analytics.customersThisWeek > 1 ? "s" : ""} this week${analytics.customersLastWeek > 0 ? ` (${analytics.customersThisWeek > analytics.customersLastWeek ? "↑" : analytics.customersThisWeek < analytics.customersLastWeek ? "↓" : "→"} vs last week)` : ""}`} />}
                    {analytics.merchantsThisWeek > 0 && <NotifPill color="green" icon="📊" text={`${analytics.merchantsThisWeek} new business${analytics.merchantsThisWeek > 1 ? "es" : ""} this week`} />}
                  </div>
                )}

                {/* Summary */}
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Platform Summary</p>
                  <div className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                    <p>
                      Stampworth currently has <span className="font-semibold text-gray-800 dark:text-gray-100">{stats.totalCustomers} customers</span> and <span className="font-semibold text-gray-800 dark:text-gray-100">{stats.totalMerchants} businesses</span> registered on the platform.
                      {analytics.customersThisWeek > 0 ? ` ${analytics.customersThisWeek} new customer${analytics.customersThisWeek > 1 ? "s" : ""} signed up this week` : " No new customer signups this week"}
                      {analytics.customersLastWeek > 0 ? ` (${analytics.customersThisWeek > analytics.customersLastWeek ? "up" : analytics.customersThisWeek < analytics.customersLastWeek ? "down" : "same"} from ${analytics.customersLastWeek} last week).` : "."}
                      {analytics.merchantsThisWeek > 0 ? ` ${analytics.merchantsThisWeek} new business${analytics.merchantsThisWeek > 1 ? "es" : ""} joined this week.` : ""}
                    </p>
                    <p>
                      There are <span className="font-semibold">{analytics.engagement.totalCards} loyalty cards</span> in circulation with an average of <span className="font-semibold">{analytics.engagement.avgStampsPerCard} stamps per card</span>.
                      {analytics.engagement.customersWithMultipleCards > 0 ? ` ${analytics.engagement.customersWithMultipleCards} customer${analytics.engagement.customersWithMultipleCards > 1 ? "s" : ""} hold cards from multiple businesses, indicating cross-store engagement.` : ""}
                    </p>
                    <p>
                      {analytics.engagement.redemptionRate > 0
                        ? `The reward redemption rate is ${analytics.engagement.redemptionRate}% — ${analytics.engagement.claimedRewards} claimed out of ${analytics.engagement.claimedRewards + analytics.engagement.pendingRewards} total rewards.`
                        : "No rewards have been issued yet."
                      }
                      {analytics.engagement.pendingRewards > 0 ? ` ${analytics.engagement.pendingRewards} reward${analytics.engagement.pendingRewards > 1 ? "s are" : " is"} pending redemption.` : ""}
                    </p>
                    <p>
                      {analytics.engagement.activeMerchants} of {stats.totalMerchants} businesses are active.
                      {analytics.engagement.merchantsWithLocation > 0 ? ` ${analytics.engagement.merchantsWithLocation} ${analytics.engagement.merchantsWithLocation > 1 ? "have" : "has"} set their store location on the map.` : " No businesses have pinned their location yet."}
                      {stats.totalMerchants > 0 && analytics.engagement.activeMerchants < stats.totalMerchants ? ` ${stats.totalMerchants - analytics.engagement.activeMerchants} business${stats.totalMerchants - analytics.engagement.activeMerchants > 1 ? "es are" : " is"} currently inactive.` : ""}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 italic pt-1">
                      All businesses are on the <span className="font-semibold">Beta (Free)</span> plan during the testing period. All features are unlimited.
                    </p>
                  </div>
                </div>

                {/* Week-over-week */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <WowCard label="Customers this week" value={analytics.customersThisWeek} prev={analytics.customersLastWeek} />
                  <WowCard label="Businesses this week" value={analytics.merchantsThisWeek} prev={analytics.merchantsLastWeek} />
                  <WowCard label="Active customers" value={analytics.engagement.activeCustomers} total={stats.totalCustomers} isPercent />
                  <WowCard label="Redemption rate" value={analytics.engagement.redemptionRate} suffix="%" />
                </div>

                {/* Engagement metrics */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Engagement</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Total Cards" value={analytics.engagement.totalCards} />
                  <StatCard label="Avg Stamps/Card" value={analytics.engagement.avgStampsPerCard} />
                  <StatCard label="Multi-Store Customers" value={analytics.engagement.customersWithMultipleCards} />
                  <StatCard label="Stores on Map" value={analytics.engagement.merchantsWithLocation} />
                </div>

                {/* Reward breakdown */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Rewards</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-medium text-amber-500 uppercase tracking-wide">Pending</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono tabular-nums">{analytics.engagement.pendingRewards}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-medium text-green-500 uppercase tracking-wide">Claimed</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1 font-mono tabular-nums">{analytics.engagement.claimedRewards}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wide">Redemption Rate</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-mono tabular-nums">{analytics.engagement.redemptionRate}%</p>
                  </div>
                </div>

                {/* Transaction breakdown */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Transaction Breakdown</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {Object.entries(analytics.txByType).map(([type, count]) => (
                    <div key={type} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                      <TypeBadge type={type} />
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-2 font-mono tabular-nums">{count}</p>
                    </div>
                  ))}
                </div>

                {/* Growth charts (sparklines) */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Growth (Last 30 Days)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <Sparkline label="Customer Signups" data={analytics.customerGrowth} color="#4f46e5" />
                  <Sparkline label="Business Signups" data={analytics.merchantGrowth} color="#27AE60" />
                  <Sparkline label="Transactions" data={analytics.transactionActivity} color="#E67E22" />
                  <Sparkline label="Rewards Issued" data={analytics.rewardActivity} color="#9B59B6" />
                </div>

                {/* Top merchants */}
                {analytics.topMerchants.length > 0 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Top Businesses by Activity</p>
                    <Table heads={["#", "Business", "Transactions", "Card Holders", "Stamps"]}>
                      {analytics.topMerchants.map((m, i) => (
                        <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{m.name}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400 text-center">{m.transactions}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400 text-center">{m.cardHolders}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400 text-center">{m.stamps}</td>
                        </tr>
                      ))}
                    </Table>
                  </>
                )}
              </>
            )}

            {/* MONITORING */}
            {tab === "monitor" && (
              <>
                {degradedServices > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-[12px] font-semibold text-red-600 dark:text-red-400">{degradedServices} service{degradedServices > 1 ? "s" : ""} degraded or down — check details below</p>
                  </div>
                )}
                {monitor && monitor.overall === "operational" && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-[12px] font-semibold text-green-600 dark:text-green-400">All systems operational</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">System Monitoring</h2>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Auto-refreshes every 30 seconds {lastRefresh && `· Last: ${lastRefresh}`}</p>
                  </div>
                  <button onClick={loadMonitor} disabled={monitorLoading} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                    <svg className={monitorLoading ? "animate-spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    {monitorLoading ? "Checking..." : "Refresh"}
                  </button>
                </div>

                {!monitor ? (
                  <div className="flex items-center justify-center h-40"><p className="text-gray-400">Loading system status...</p></div>
                ) : (
                  <>
                    {/* Overall status banner */}
                    <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${monitor.overall === "operational" ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : monitor.overall === "slow" ? "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800" : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"}`}>
                      <div className={`w-3 h-3 rounded-full ${monitor.overall === "operational" ? "bg-green-500 animate-pulse" : monitor.overall === "slow" ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                      <p className={`text-[14px] font-semibold ${monitor.overall === "operational" ? "text-green-700 dark:text-green-300" : monitor.overall === "slow" ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>
                        {monitor.overall === "operational" ? "All Systems Operational" : monitor.overall === "slow" ? "Some Services Slow" : "Service Disruption Detected"}
                      </p>
                    </div>

                    {/* Services grid */}
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Services</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                      {monitor.services.map((s) => (
                        <div key={s.name} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${s.status === "up" ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : s.status === "slow" ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.status === "up" ? "bg-green-500" : s.status === "slow" ? "bg-amber-500" : "bg-red-500"}`} />
                              {s.status === "up" ? "Operational" : s.status === "slow" ? "Slow" : "Down"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">Latency</p>
                            <p className={`text-[12px] font-semibold ${s.latency < 500 ? "text-green-600 dark:text-green-400" : s.latency < 2000 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{s.latency}ms</p>
                          </div>
                          {s.error && <p className="text-[10px] text-red-500 mt-1 truncate">{s.error}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Database usage */}
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Database Usage</p>
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-5">
                      {/* Storage bar */}
                      <div className="mb-4">
                        <div className="flex justify-between mb-1.5">
                          <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Estimated Storage</p>
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">{monitor.database.estimatedStorageMB} MB / {monitor.database.freeStorageLimitMB} MB</p>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${(monitor.database.estimatedStorageMB / monitor.database.freeStorageLimitMB) > 0.8 ? "bg-red-500" : (monitor.database.estimatedStorageMB / monitor.database.freeStorageLimitMB) > 0.5 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, (monitor.database.estimatedStorageMB / monitor.database.freeStorageLimitMB) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{Math.round((monitor.database.estimatedStorageMB / monitor.database.freeStorageLimitMB) * 100)}% of free tier used</p>
                      </div>

                      {/* Table row counts */}
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Table Records</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(monitor.database.tables).map(([table, count]) => (
                          <div key={table} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">{table.replace(/_/g, " ")}</p>
                            <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100">{count}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Total Records</p>
                        <p className="text-[14px] font-bold text-gray-800 dark:text-gray-100">{monitor.database.totalRows.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Free tier limits */}
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Free Tier Limits</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                      <LimitCard label="Database Storage" used={monitor.database.estimatedStorageMB} limit={500} unit="MB" />
                      <LimitCard label="Monthly Active Users" used={(monitor.database.tables.customers || 0) + (monitor.database.tables.merchants || 0)} limit={50000} unit="users" />
                      <LimitCard label="Realtime Connections" used={0} limit={200} unit="connections" note="Live count unavailable" />
                      <LimitCard label="API Requests" used={0} limit={500000} unit="/month" note="Check Supabase dashboard" />
                    </div>

                    {/* Deployment info */}
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Deployment</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Admin Dashboard</p>
                        <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">Vercel</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Next.js · Free tier</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Backend API</p>
                        <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">DigitalOcean</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">NestJS · $5/mo</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Database</p>
                        <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">Supabase</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">PostgreSQL · Free tier</p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* SUPPORT INBOX */}
            {tab === "support" && (
              <>
                {unreadSupport > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[12px] font-semibold text-orange-600 dark:text-orange-400">{unreadSupport} unread support message{unreadSupport > 1 ? "s" : ""} awaiting review</p>
                  </div>
                )}
                {supportMessages.filter((m) => m.is_read && !m.is_replied).length > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">{supportMessages.filter((m) => m.is_read && !m.is_replied).length} message{supportMessages.filter((m) => m.is_read && !m.is_replied).length > 1 ? "s" : ""} read but not yet replied</p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    Support Inbox <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({supportMessages.length})</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">{supportMessages.filter((m) => !m.is_read).length} unread</span>
                  </div>
                </div>

                {supportMessages.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
                    <svg className="mx-auto mb-3 text-gray-300 dark:text-gray-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                    <p className="text-gray-400 dark:text-gray-500 text-[13px] font-medium">No support messages yet</p>
                    <p className="text-gray-300 dark:text-gray-600 text-[11px] mt-1">Messages from customers and businesses will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supportMessages.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={async () => {
                          setSelectedMessage(msg);
                          if (!msg.is_read) {
                            await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "support_message", id: msg.id, data: { is_read: true } }) });
                            setSupportMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
                          }
                        }}
                        className={`w-full text-left bg-white dark:bg-gray-900 rounded-xl border ${msg.is_read ? "border-gray-100 dark:border-gray-800" : "border-indigo-500 dark:border-indigo-400"} p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.sender_type === "customer" ? "bg-blue-50 dark:bg-blue-950" : "bg-green-50 dark:bg-green-950"}`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={msg.sender_type === "customer" ? "#4f46e5" : "#27AE60"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {msg.sender_type === "customer"
                                  ? <><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0113 0"/></>
                                  : <><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0H3m2 0h14M9 7h6m-6 4h6m-6 4h4"/></>
                                }
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className={`text-[13px] font-semibold ${msg.is_read ? "text-gray-700 dark:text-gray-300" : "text-gray-800 dark:text-gray-100"} truncate`}>{msg.sender_name || msg.sender_email}</p>
                                {!msg.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 shrink-0" />}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${msg.sender_type === "customer" ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"}`}>
                                  {msg.sender_type.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{msg.subject || "(No subject)"}</p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{msg.message}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmt(msg.created_at)}</p>
                            {msg.is_replied && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400">REPLIED</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* BROADCAST */}
            {tab === "broadcast" && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Broadcast to App Users</h2>

                {/* Compose */}
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-6">
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-4">New Broadcast</p>

                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 block">Target Audience</label>
                    <div className="flex gap-2">
                      {(["all", "customers", "merchants"] as const).map((t) => (
                        <button key={t} onClick={() => setBroadcastTarget(t)} className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors ${broadcastTarget === t ? "bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                          {t === "all" ? "Everyone" : t === "customers" ? "Customers Only" : "Businesses Only"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 block">Title</label>
                    <input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="e.g. New Feature Available!" className="w-full h-10 px-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400" />
                  </div>

                  <div className="mb-4">
                    <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 block">Message</label>
                    <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Write your message to all users..." rows={3} className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 resize-none" />
                  </div>

                  <button
                    disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                    onClick={async () => {
                      setSendingBroadcast(true);
                      try {
                        await fetch("/api/data", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "dev_broadcast", data: { title: broadcastTitle.trim(), message: broadcastMessage.trim(), target: broadcastTarget } }),
                        });
                        setBroadcastTitle(""); setBroadcastMessage(""); setBroadcastTarget("all");
                      } catch {}
                      setSendingBroadcast(false);
                    }}
                    className="h-11 px-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900 text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                    {sendingBroadcast ? "Sending..." : "Send Broadcast"}
                  </button>
                </div>

                {/* History */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Broadcast History</p>
                {devBroadcasts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
                    <svg className="mx-auto mb-3 text-gray-300 dark:text-gray-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6"/></svg>
                    <p className="text-gray-400 dark:text-gray-500 text-[13px] font-medium">No broadcasts sent yet</p>
                    <p className="text-gray-300 dark:text-gray-600 text-[11px] mt-1">Messages you send will appear in both apps as notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {devBroadcasts.map((b) => (
                      <div key={b.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{b.title}</p>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${b.target === "all" ? "bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400" : b.target === "customers" ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"}`}>
                                {b.target === "all" ? "ALL USERS" : b.target === "customers" ? "CUSTOMERS" : "BUSINESSES"}
                              </span>
                            </div>
                            <p className="text-[12px] text-gray-500 dark:text-gray-400">{b.message}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">{fmt(b.created_at)}</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this broadcast?")) return;
                              await fetch("/api/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "dev_broadcast", id: b.id }) });
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center shrink-0"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* MAP */}
            {tab === "map" && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Store Locations</h2>
                {merchantsNoLocation > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">{merchantsNoLocation} business{merchantsNoLocation > 1 ? "es" : ""} ha{merchantsNoLocation > 1 ? "ve" : "s"} not set their store location yet</p>
                  </div>
                )}
                <StoreMap merchants={merchantsWithLocation} onSelect={(m) => { setSelectedMerchant(m); setTab("merchants"); }} />
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-3">{merchantsWithLocation.length} of {merchants.length} stores have set their location</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {merchantsWithLocation.map((m) => (
                    <button key={m.id} onClick={() => { setSelectedMerchant(m); setTab("merchants"); }} className="text-left bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4 hover:border-indigo-400/40 dark:hover:border-indigo-400/40 transition-colors flex items-center gap-3">
                      {m.logo_url ? (
                        <img src={m.logo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-gray-100 dark:border-gray-700" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white text-[13px] font-bold flex items-center justify-center">{m.business_name.charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">{m.business_name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{[m.address, m.city].filter(Boolean).join(", ") || "No address"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* CUSTOMERS */}
            {tab === "customers" && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Customers <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({customers.length})</span></h2>
                {newCustomersToday > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">{newCustomersToday} new customer{newCustomersToday > 1 ? "s" : ""} registered today</p>
                  </div>
                )}
                <div className="sm:hidden space-y-2">
                  {customers.map((c, i) => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
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
                      <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{c.full_name || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">@{c.username}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{c.email}</td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px]">{fmt(c.created_at)}</td>
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
            {tab === "merchants" && !selectedMerchant && (() => {
              const displayMerchants = selectedDate === "all" ? merchants : merchants.filter((m) => m.created_at.startsWith(selectedDate));
              return (
              <>
                {(newMerchantsToday > 0 || inactiveMerchants > 0) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {newMerchantsToday > 0 && <NotifPill color="green" icon="🆕" text={`${newMerchantsToday} new business${newMerchantsToday > 1 ? "es" : ""} registered today`} />}
                    {inactiveMerchants > 0 && <NotifPill color="red" icon="⚠️" text={`${inactiveMerchants} inactive business${inactiveMerchants > 1 ? "es" : ""}`} />}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Businesses <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({displayMerchants.length}{selectedDate !== "all" ? ` on ${dateLabel(selectedDate).toLowerCase()} · ${merchants.length} total` : " total"})</span></h2>
                  <div className="flex items-center gap-2 relative">
                    <button onClick={() => setSelectedDate("all")} className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${selectedDate === "all" ? "bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>All</button>
                    <button onClick={() => setSelectedDate(todayStr)} className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${selectedDate === todayStr ? "bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>Today</button>
                    <button onClick={() => setShowCalendar(!showCalendar)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${selectedDate !== "all" && selectedDate !== todayStr ? "bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-400"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {selectedDate !== "all" && selectedDate !== todayStr ? dateLabel(selectedDate) : "Pick Date"}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </button>

                    {showCalendar && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                        <div className="absolute right-0 top-12 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 w-[300px]">
                          <div className="flex items-center justify-between mb-3">
                            <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
                            <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{calendarMonthLabel}</p>
                            <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></button>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 mb-1">
                            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
                            ))}
                          </div>
                          {calendarMonth.weeks.map((week, wi) => (
                            <div key={wi} className="grid grid-cols-7 gap-0.5">
                              {week.map((day, di) => {
                                if (day === null) return <div key={di} />;
                                const ds = `${calendarMonth.year}-${String(calendarMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const isSelected = ds === selectedDate;
                                const isToday = ds === todayStr;
                                const hasData = dayHasRecords(day);
                                return (
                                  <button key={di} onClick={() => pickDay(day)} className={`relative h-9 rounded-lg text-[12px] font-medium transition-colors ${isSelected ? "bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900" : isToday ? "bg-blue-50 dark:bg-blue-950 text-gray-800 dark:text-gray-100" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                                    {day}
                                    {hasData && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {displayMerchants.map((m) => {
                    const ms = merchantStatsMap[m.id];
                    return (
                      <div key={m.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                          <button onClick={() => setSelectedMerchant(m)} className="font-medium text-[13px] text-gray-800 dark:text-gray-100">{m.business_name}</button>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${m.is_active ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>{m.is_active ? "Active" : "Inactive"}</span>
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
                  {displayMerchants.length === 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-10 text-center">
                      <p className="text-gray-400 dark:text-gray-500 text-[12px]">No businesses registered on {dateLabel(selectedDate).toLowerCase()}</p>
                    </div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  {displayMerchants.length > 0 ? (
                    <Table heads={["#", "Business", "Email", "Plan", "Card Holders", "Stamps", "Status", "Actions"]}>
                      {displayMerchants.map((m, i) => {
                        const ms = merchantStatsMap[m.id];
                        return (
                          <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2.5 text-gray-300 dark:text-gray-600 text-[11px]">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100 cursor-pointer" onClick={() => setSelectedMerchant(m)}>{m.business_name}</td>
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
                  ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-10 text-center">
                      <p className="text-gray-400 dark:text-gray-500 text-[12px]">No businesses registered on {dateLabel(selectedDate).toLowerCase()}</p>
                    </div>
                  )}
                </div>
              </>
              );
            })()}

            {/* MERCHANT DETAIL */}
            {tab === "merchants" && selectedMerchant && (() => {
              const ms = merchantStatsMap[selectedMerchant.id];
              return (
                <>
                  <button onClick={() => setSelectedMerchant(null)} className="text-[13px] text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-indigo-400 mb-4 flex items-center gap-1">← Back to Businesses</button>

                  {/* Merchant header */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white dark:text-gray-900 text-lg font-bold shrink-0" style={{ backgroundColor: ms?.cardColor || "#4f46e5" }}>{selectedMerchant.business_name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{selectedMerchant.business_name}</h3>
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
                    {selectedMerchant.latitude && selectedMerchant.longitude && (
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Store Location</p>
                        <StoreMap merchants={[selectedMerchant]} onSelect={() => {}} />
                      </div>
                    )}
                  </div>

                  {/* Subscription & Earnings */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Subscription & Earnings</p>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Transactions</p>
                  <Table heads={["Type", "Customer", "Stamps", "Notes", "Date"]}>
                    {merchantTx.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-2.5"><TypeBadge type={tx.transaction_type} /></td>
                        <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400">{tx.customers?.full_name || tx.customers?.email || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{tx.stamp_count_after ?? "-"}</td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] max-w-[200px] truncate">{tx.notes || "-"}</td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(tx.created_at)}</td>
                      </tr>
                    ))}
                  </Table>
                  {merchantTx.length === 0 && <Empty />}

                  {/* Rewards */}
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 mt-6">Rewards <span className="text-gray-400 dark:text-gray-500 font-normal">({merchantRewards.length})</span></p>
                  {merchantRewards.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-medium text-amber-500 dark:text-amber-400 uppercase">Pending</p>
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{merchantRewards.filter((r: any) => !r.is_used).length}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-medium text-green-500 dark:text-green-400 uppercase">Claimed</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">{merchantRewards.filter((r: any) => r.is_used).length}</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-medium text-purple-500 dark:text-purple-400 uppercase">Total</p>
                          <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{merchantRewards.length}</p>
                        </div>
                      </div>

                      {/* Mobile reward cards */}
                      <div className="sm:hidden space-y-2">
                        {merchantRewards.map((r: any) => (
                          <div key={r.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{r.reward_code}</p>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.is_used ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>{r.is_used ? "Claimed" : "Pending"}</span>
                            </div>
                            <p className="text-[12px] text-gray-600 dark:text-gray-400">{r.customers?.full_name || r.customers?.email || "-"}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{r.stamps_used} stamps · {fmt(r.created_at)}</p>
                            {r.used_at && <p className="text-[10px] text-green-500 mt-0.5">Used: {fmt(r.used_at)}</p>}
                          </div>
                        ))}
                      </div>

                      {/* Desktop rewards table */}
                      <div className="hidden sm:block">
                        <Table heads={["Code", "Customer", "Stamps", "Status", "Earned", "Used"]}>
                          {merchantRewards.map((r: any) => (
                            <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">{r.reward_code}</td>
                              <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400">{r.customers?.full_name || r.customers?.email || "-"}</td>
                              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{r.stamps_used}</td>
                              <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.is_used ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>{r.is_used ? "Claimed" : "Pending"}</span></td>
                              <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(r.created_at)}</td>
                              <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{r.used_at ? fmt(r.used_at) : "-"}</td>
                            </tr>
                          ))}
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                      <p className="text-gray-400 dark:text-gray-500 text-[12px]">No rewards issued yet for this business</p>
                    </div>
                  )}
                </>
              );
            })()}

            {/* REWARDS */}
            {tab === "rewards" && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">All Rewards <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({rewards.length})</span></h2>
                {pendingRewardsCount > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <p className="text-[12px] font-semibold text-purple-600 dark:text-purple-400">{pendingRewardsCount} reward{pendingRewardsCount > 1 ? "s" : ""} pending redemption</p>
                  </div>
                )}
                <div className="sm:hidden space-y-2">
                  {rewards.map((r: any) => (
                    <div key={r.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
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
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">{r.reward_code}</td>
                        <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400">{r.customers?.full_name || r.customers?.email || "-"}</td>
                        <td className="px-4 py-2 text-[12px] text-gray-600 dark:text-gray-400">{r.merchants?.business_name || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{r.stamps_used}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.is_used ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>{r.is_used ? "Claimed" : "Pending"}</span></td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-[11px] whitespace-nowrap">{r.used_at ? fmt(r.used_at) : "-"}</td>
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

      {/* SUPPORT MESSAGE DETAIL MODAL */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMessage(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-lg p-6 shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${selectedMessage.sender_type === "customer" ? "bg-blue-50 dark:bg-blue-950" : "bg-green-50 dark:bg-green-950"}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selectedMessage.sender_type === "customer" ? "#4f46e5" : "#27AE60"} strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0113 0"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-800 dark:text-gray-200 truncate">{selectedMessage.sender_name || "—"}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{selectedMessage.sender_email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${selectedMessage.sender_type === "customer" ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"}`}>
                      {selectedMessage.sender_type.toUpperCase()}
                    </span>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmt(selectedMessage.created_at)}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {selectedMessage.subject && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{selectedMessage.subject}</p>
              </div>
            )}

            <div className="mb-5">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Message</p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={`mailto:${selectedMessage.sender_email}?subject=Re: ${selectedMessage.subject || "Stampworth Support"}`}
                onClick={async () => {
                  if (!selectedMessage.is_replied) {
                    await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "support_message", id: selectedMessage.id, data: { is_replied: true } }) });
                    setSupportMessages((prev) => prev.map((m) => m.id === selectedMessage.id ? { ...m, is_replied: true } : m));
                  }
                }}
                className="flex-1 h-11 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900 text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 12,13 21,6"/><rect x="3" y="6" width="18" height="12" rx="2"/></svg>
                Reply via Email
              </a>
              <button
                onClick={async () => {
                  if (!confirm("Delete this message?")) return;
                  await fetch("/api/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "support_message", id: selectedMessage.id }) });
                  setSupportMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
                  setSelectedMessage(null);
                }}
                className="h-11 px-4 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-[13px] font-semibold hover:bg-red-100 dark:hover:bg-red-900"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100">Edit {editModal.type === "customer" ? "Customer" : "Business"}</h3>
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
                    <input value={val} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditModal(null)} className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-[13px] font-semibold text-gray-500 dark:text-gray-400">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 h-10 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white dark:text-gray-900 text-[13px] font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1 font-mono tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

const notifColorMap: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
  green: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
  orange: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400",
  red: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
  purple: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400",
};

function NotifPill({ color, icon, text, onClick }: { color: string; icon: string; text: string; onClick?: () => void }) {
  const cls = notifColorMap[color] || notifColorMap.blue;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${cls} ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}>
      <span className="text-[10px]">{icon}</span>
      {text}
    </Tag>
  );
}

function Table({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto shadow-sm">
      <table className="w-full text-[12px] min-w-[500px]">
        <thead><tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">{heads.map((h) => <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="[&>tr:nth-child(even)]:bg-gray-50/50 dark:[&>tr:nth-child(even)]:bg-gray-800/20">{children}</tbody>
      </table>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = { STAMP_EARNED: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400", STAMP_REMOVED: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400", REWARD_STORED: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400", REWARD_REDEEMED: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400" };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${s[type] || "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{type.replace(/_/g, " ")}</span>;
}

function Empty() { return <p className="text-center text-gray-400 dark:text-gray-500 text-[12px] py-10">No data yet</p>; }

function LimitCard({ label, used, limit, unit, note }: { label: string; used: number; limit: number; unit: string; note?: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4">
      <div className="flex justify-between mb-1">
        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">{used.toLocaleString()} / {limit.toLocaleString()} {unit}</p>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">{note || `${Math.round(pct)}% used`}</p>
    </div>
  );
}

function WowCard({ label, value, prev, suffix, isPercent, total }: { label: string; value: number; prev?: number; suffix?: string; isPercent?: boolean; total?: number }) {
  const display = isPercent && total ? (total > 0 ? Math.round((value / total) * 100) : 0) : value;
  const displaySuffix = isPercent ? "%" : suffix || "";
  const change = prev !== undefined ? value - prev : null;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-xl font-bold text-gray-800 dark:text-gray-100 font-mono tabular-nums">{display}{displaySuffix}</p>
        {change !== null && (
          <span className={`text-[10px] font-semibold ${change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-400"}`}>
            {change > 0 ? "↑" : change < 0 ? "↓" : "—"}{change !== 0 ? ` ${Math.abs(change)}` : ""}
          </span>
        )}
      </div>
      {prev !== undefined && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">vs {prev} last week</p>}
    </div>
  );
}

function Sparkline({ label, data, color }: { label: string; data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-[11px] font-bold font-mono tabular-nums" style={{ color }}>{total} total</p>
      </div>
      <div className="flex items-end gap-[2px] h-12">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all hover:opacity-80 relative group"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%`, backgroundColor: d.count > 0 ? color : (color + "20") }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <p className="text-[9px] text-gray-400 dark:text-gray-500">{data[0]?.date.slice(5)}</p>
        <p className="text-[9px] text-gray-400 dark:text-gray-500">{data[data.length - 1]?.date.slice(5)}</p>
      </div>
    </div>
  );
}

function StoreMap({ merchants, onSelect }: { merchants: Merchant[]; onSelect: (m: Merchant) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [expanded, setExpanded] = useState(false);

  const esc = (s: string) => s.replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  const center = merchants.find((m) => m.latitude && m.longitude);
  const centerLat = center?.latitude || 14.5995;
  const centerLng = center?.longitude || 120.9842;

  const storeMarkers = merchants.filter((m) => m.latitude && m.longitude).map((m) => {
    const popup = `<div style="font-family:system-ui;padding:2px 0"><b style="color:#4f46e5">${esc(m.business_name)}</b><br/><span style="color:#888;font-size:11px">${esc([m.address, m.city].filter(Boolean).join(", ") || "No address")}</span></div>`;
    const nameLabel = `(function(){var n='${esc(m.business_name)}';var el=document.createElement('span');el.textContent=n;el.style.cssText='position:absolute;visibility:hidden;font:600 10px system-ui';document.body.appendChild(el);var w=el.offsetWidth+18;document.body.removeChild(el);L.marker([${m.latitude},${m.longitude}],{icon:L.divIcon({className:'',html:'<div style="width:'+w+'px;font-family:system-ui;font-size:10px;font-weight:600;color:#fff;background:#4f46e5;padding:4px 9px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.25);text-align:center;pointer-events:none;line-height:1.2">'+n+'</div>',iconSize:[w,18],iconAnchor:[w/2,-20]}),interactive:false}).addTo(map)})();`;
    if (m.logo_url) {
      return `(function(){
        var ic=L.divIcon({className:'',html:'<div style="width:34px;height:34px;border-radius:50%;border:3px solid #fff;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#4f46e5;display:flex;align-items:center;justify-content:center"><img src="${esc(m.logo_url)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\\'none\\'"/></div>',iconSize:[34,34],iconAnchor:[17,17]});
        L.marker([${m.latitude},${m.longitude}],{icon:ic}).addTo(map).bindPopup('${popup.replace(/'/g, "\\'")}').on('click',function(){window.parent.postMessage({type:'store',id:'${m.id}'},'*')});
        ${nameLabel}
      })();`;
    }
    return `L.circleMarker([${m.latitude},${m.longitude}],{radius:12,fillColor:'#4f46e5',color:'#fff',weight:3,fillOpacity:1}).addTo(map).bindPopup('${popup.replace(/'/g, "\\'")}').on('click',function(){window.parent.postMessage({type:'store',id:'${m.id}'},'*')});
    ${nameLabel}`;
  }).join("\n");

  const bounds = merchants.filter((m) => m.latitude && m.longitude).map((m) => `[${m.latitude},${m.longitude}]`);
  const fitBounds = bounds.length > 1 ? `map.fitBounds([${bounds.join(",")}],{padding:[40,40],maxZoom:14});` : "";

  const html = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>html,body,#map{width:100%;height:100%;margin:0;padding:0;}</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{attributionControl:false}).setView([${centerLat},${centerLng}],12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:''}).addTo(map);
${storeMarkers}
${fitBounds}
<\/script>
</body></html>`;

  // Handle clicks from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "store") {
        const m = merchants.find((x) => x.id === e.data.id);
        if (m) onSelect(m);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [merchants, onSelect]);

  return (
    <>
      <div className="relative w-full rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden" style={{ height: "clamp(360px, 55vw, 540px)" }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          className="w-full h-full"
          style={{ border: "none" }}
          sandbox="allow-scripts allow-same-origin"
        />
        <button onClick={() => setExpanded(true)} className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-colors" title="Expand map">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-2.5 py-1 rounded-md shadow-sm text-[10px] font-mono text-gray-500 dark:text-gray-400">
          {merchants.filter((m) => m.latitude && m.longitude).length} stores on map
        </div>
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl">
            <iframe
              srcDoc={html}
              className="w-full h-full"
              style={{ border: "none" }}
              sandbox="allow-scripts allow-same-origin"
            />
            <button onClick={() => setExpanded(false)} className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-colors" title="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21h6v-6M15 3H9v6M3 21l7-7M21 3l-7 7"/></svg>
            </button>
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-md text-xs font-mono text-gray-600 dark:text-gray-300">
              {merchants.filter((m) => m.latitude && m.longitude).length} stores on map
            </div>
          </div>
        </div>
      )}
    </>
  );
}
