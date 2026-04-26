import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Logo" width={24} height={24} />
            <span className="font-bold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="hidden sm:flex gap-6 text-[13px] text-[#8A94A6] font-medium">
            <a href="#how" className="hover:text-[#2F4366] transition">How it works</a>
            <a href="#customers" className="hover:text-[#2F4366] transition">Customers</a>
            <a href="#business" className="hover:text-[#2F4366] transition">Business</a>
            <a href="#download" className="hover:text-[#2F4366] transition">Download</a>
          </div>
          <a href="#download" className="text-[13px] font-semibold text-white bg-[#2F4366] px-4 py-2 rounded-lg hover:bg-[#243552] transition">Download</a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-5">
          <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
            <span className="fade-up text-[11px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-6">Android Beta Testing</span>
            <h1 className="fade-up d1 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A2E] leading-tight max-w-xl">
              Your virtual loyalty card.
            </h1>
            <p className="fade-up d2 text-[#8A94A6] mt-4 max-w-md leading-relaxed">
              Ditch paper stamp cards. Earn rewards with a QR code. Built for Filipino SMEs.
            </p>
            <div className="fade-up d3 flex gap-3 mt-8">
              <a href="#download" className="text-white text-sm font-semibold bg-[#2F4366] px-6 py-2.5 rounded-xl hover:bg-[#243552] transition">Download APK</a>
              <a href="#how" className="text-sm font-semibold text-[#8A94A6] px-5 py-2.5 rounded-xl border border-zinc-200 hover:border-[#2F4366] hover:text-[#2F4366] transition">Learn more</a>
            </div>
            <div className="fade-up d4 mt-14 w-56 sm:w-64">
              <Image src="/images/main.png" alt="Stampworth" width={300} height={650} className="w-full rounded-2xl border border-zinc-200 shadow-xl" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20 px-5 border-t border-zinc-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#1A1A2E] text-center mb-12">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-10 text-center">
              {[
                { n: "1", t: "Show QR", d: "Open the app and show your QR code at the counter." },
                { n: "2", t: "Get stamped", d: "Merchant scans your code. You earn a digital stamp." },
                { n: "3", t: "Claim reward", d: "Card full? Your free reward is ready to claim." },
              ].map((s) => (
                <div key={s.n}>
                  <div className="mx-auto w-8 h-8 rounded-full bg-[#2F4366] text-white text-sm font-bold flex items-center justify-center mb-3">{s.n}</div>
                  <h3 className="font-semibold text-[#1A1A2E] text-sm">{s.t}</h3>
                  <p className="text-[13px] text-[#8A94A6] mt-1">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Customers */}
        <section id="customers" className="py-20 px-5 bg-zinc-50 border-t border-zinc-100">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1 text-center">For customers</p>
            <h2 className="text-xl font-bold text-[#1A1A2E] text-center mb-10">All your stamp cards in one app.</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { img: "cards", t: "Loyalty Cards" },
                { img: "qrcode", t: "QR Code" },
                { img: "map", t: "Store Map" },
                { img: "nearby", t: "Nearby Alerts" },
                { img: "notification", t: "Notifications" },
                { img: "view", t: "Track Rewards" },
              ].map((c) => (
                <div key={c.img}>
                  <Image src={`/images/${c.img}.png`} alt={c.t} width={300} height={650} className="w-full rounded-xl border border-zinc-200 hover:shadow-md transition-shadow duration-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">{c.t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Business */}
        <section id="business" className="py-20 px-5 border-t border-zinc-100">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#2F4366] mb-1 text-center">For business owners</p>
            <h2 className="text-xl font-bold text-[#1A1A2E] text-center mb-2">Launch a loyalty program in 5 minutes.</h2>
            <p className="text-[13px] text-[#8A94A6] text-center mb-10">No hardware. Just your Android phone.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { img: "scan", t: "Scan & Stamp" },
                { img: "track_customer", t: "Live Customer Map" },
                { img: "broadcast", t: "Broadcast Messages" },
              ].map((c) => (
                <div key={c.img}>
                  <Image src={`/images/${c.img}.png`} alt={c.t} width={300} height={650} className="w-full rounded-xl border border-zinc-200 hover:shadow-md transition-shadow duration-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">{c.t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-5 bg-zinc-50 border-t border-zinc-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#1A1A2E] text-center mb-10">Simple pricing.</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { n: "Beta", p: "Free", per: "", c: "#8B5CF6", now: true, f: ["Unlimited all", "Every feature", "No card needed"] },
                { n: "Starter", p: "₱149", per: "/mo", c: "#2F4366", now: false, f: ["100 holders", "500 scans/mo", "Email support"] },
                { n: "Growth", p: "₱349", per: "/mo", c: "#27AE60", now: false, f: ["1K holders", "Unlimited scans", "Priority support"] },
                { n: "Scale", p: "₱799", per: "/mo", c: "#E67E22", now: false, f: ["Unlimited", "Multi-branch", "API access"] },
              ].map((pl) => (
                <div key={pl.n} className={`bg-white rounded-xl p-4 border ${pl.now ? "border-[#8B5CF6]" : "border-zinc-200"}`}>
                  {pl.now && <p className="text-[9px] font-bold text-[#8B5CF6] uppercase tracking-wider mb-1">Current</p>}
                  <p className="text-sm font-bold" style={{ color: pl.c }}>{pl.n}</p>
                  <p className="mt-1"><span className="text-xl font-extrabold text-[#1A1A2E]">{pl.p}</span><span className="text-[11px] text-[#8A94A6]">{pl.per}</span></p>
                  <ul className="mt-3 space-y-1.5">
                    {pl.f.map((f) => <li key={f} className="text-[11px] text-[#8A94A6] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: pl.c }} />{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Download */}
        <section id="download" className="py-20 px-5 bg-[#2F4366] text-white">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-4">Android Beta — Scan to download</p>
            <h2 className="text-2xl font-bold mb-2">Get Stampworth</h2>
            <p className="text-white/50 text-sm mb-10">Scan the QR code with your phone camera.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {[
                { label: "Stampworth", sub: "For customers", logo: "/images/logo.png" },
                { label: "Stampworth Business", sub: "For store owners", logo: "/images/logo-business.png" },
              ].map((app) => (
                <div key={app.label} className="bg-white rounded-2xl p-5 w-48">
                  <div className="w-32 h-32 mx-auto mb-3 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" width="110" height="110"><rect width="200" height="200" fill="white"/><g fill="#2F4366"><rect x="20" y="20" width="60" height="60"/><rect x="30" y="30" width="40" height="40" fill="white"/><rect x="40" y="40" width="20" height="20"/><rect x="120" y="20" width="60" height="60"/><rect x="130" y="30" width="40" height="40" fill="white"/><rect x="140" y="40" width="20" height="20"/><rect x="20" y="120" width="60" height="60"/><rect x="30" y="130" width="40" height="40" fill="white"/><rect x="40" y="140" width="20" height="20"/><rect x="90" y="20" width="10" height="10"/><rect x="90" y="50" width="10" height="10"/><rect x="20" y="90" width="10" height="10"/><rect x="50" y="90" width="10" height="10"/><rect x="90" y="90" width="10" height="10"/><rect x="120" y="100" width="10" height="10"/><rect x="150" y="100" width="10" height="10"/><rect x="90" y="120" width="10" height="10"/><rect x="120" y="130" width="20" height="20"/><rect x="160" y="130" width="10" height="10"/><rect x="120" y="160" width="10" height="10"/><rect x="150" y="170" width="20" height="10"/></g></svg>
                  </div>
                  <Image src={app.logo} alt={app.label} width={20} height={20} className="mx-auto mb-1" />
                  <p className="text-sm font-bold text-[#1A1A2E]">{app.label}</p>
                  <p className="text-[11px] text-[#8A94A6]">{app.sub}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 mt-8">QR codes link to APK downloads once builds are published.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#8A94A6]">
          <div className="flex items-center gap-1.5">
            <Image src="/images/logo.png" alt="Logo" width={16} height={16} />
            <span className="font-semibold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2F4366]">Privacy</a>
            <a href="#" className="hover:text-[#2F4366]">Terms</a>
            <a href="#" className="hover:text-[#2F4366]">Contact</a>
          </div>
          <p className="text-[#C4CAD4]">© 2026 Stampworth</p>
        </div>
      </footer>
    </>
  );
}
