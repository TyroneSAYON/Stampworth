import Image from "next/image";

const S = "#2F4366";

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[20px] overflow-hidden border border-zinc-200 shadow-sm bg-white">
      <Image src={src} alt={alt} width={300} height={650} className="w-full h-auto" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="mx-auto max-w-6xl flex items-center justify-between h-14 px-5">
          <a href="#" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Logo" width={26} height={26} />
            <span className="font-bold text-[15px]" style={{ color: S }}>Stampworth</span>
          </a>
          <nav className="hidden sm:flex gap-7 text-[13px] text-[#8A94A6] font-medium">
            <a href="#how" className="hover:text-[#2F4366] transition">How it works</a>
            <a href="#customers" className="hover:text-[#2F4366] transition">Customers</a>
            <a href="#business" className="hover:text-[#2F4366] transition">Business</a>
            <a href="#pricing" className="hover:text-[#2F4366] transition">Pricing</a>
          </nav>
          <a href="#download" className="text-[13px] font-semibold text-white px-4 py-2 rounded-lg transition" style={{ background: S }}>
            Download
          </a>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="pt-28 sm:pt-36 pb-10 px-5">
          <div className="mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <span className="animate-fade-up inline-block text-[11px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-5">
                Android Beta
              </span>
              <h1 className="animate-fade-up delay-100 text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.1] text-[#1A1A2E] tracking-tight">
                Your virtual<br className="hidden sm:block" /> loyalty card.
              </h1>
              <p className="animate-fade-up delay-200 mt-4 text-[15px] leading-relaxed text-[#8A94A6] max-w-md mx-auto lg:mx-0">
                Ditch paper stamp cards. Earn rewards with a QR code. Built for Filipino SMEs and their customers.
              </p>
              <div className="animate-fade-up delay-300 mt-7 flex flex-wrap justify-center lg:justify-start gap-3">
                <a href="#download" className="text-white text-[13px] font-semibold px-6 py-2.5 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5" style={{ background: S, boxShadow: `0 8px 24px ${S}30` }}>
                  Download APK
                </a>
                <a href="#how" className="text-[13px] font-semibold text-[#8A94A6] px-5 py-2.5 rounded-xl border border-zinc-200 hover:border-[#2F4366] hover:text-[#2F4366] transition-all">
                  Learn more
                </a>
              </div>
            </div>
            <div className="animate-scale-in delay-300 w-64 sm:w-72 shrink-0 animate-float">
              <Phone src="/images/main.png" alt="Stampworth app" />
            </div>
          </div>
        </section>

        {/* App screenshots */}
        <section className="px-5 pb-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["qrcode", "cards", "map", "view"].map((name, i) => (
                <div key={name} className={`animate-fade-up rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`} style={{ animationDelay: `${(i + 2) * 100}ms` }}>
                  <Image src={`/images/${name}.png`} alt={name} width={360} height={780} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="py-20 px-5 border-t border-zinc-100">
          <div className="mx-auto max-w-3xl text-center mb-12 animate-fade-up">
            <h2 className="text-2xl font-bold text-[#1A1A2E]">How it works</h2>
            <p className="text-sm text-[#8A94A6] mt-2">Three steps. No paper.</p>
          </div>
          <div className="mx-auto max-w-4xl grid sm:grid-cols-3 gap-8 text-center">
            {[
              { n: "1", t: "Show QR", d: "Open the app, show your QR code at the counter." },
              { n: "2", t: "Get stamped", d: "Merchant scans your code — you earn a stamp." },
              { n: "3", t: "Claim reward", d: "Card full? Your free reward is ready." },
            ].map((s) => (
              <div key={s.n} className="animate-fade-up" style={{ animationDelay: `${Number(s.n) * 150}ms` }}>
                <div className="mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3" style={{ background: S }}>{s.n}</div>
                <h3 className="font-semibold text-[#1A1A2E] text-[15px]">{s.t}</h3>
                <p className="text-[13px] text-[#8A94A6] mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── For Customers ── */}
        <section id="customers" className="py-20 px-5 bg-zinc-50/70 border-t border-zinc-100">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1">For customers</p>
              <h2 className="text-2xl font-bold text-[#1A1A2E]">All your stamp cards in one app.</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                { img: "cards", t: "Loyalty Cards" },
                { img: "qrcode", t: "QR Code" },
                { img: "map", t: "Store Map" },
                { img: "nearby", t: "Nearby Alerts" },
                { img: "notification", t: "Notifications" },
                { img: "view", t: "Track Rewards" },
              ].map((c) => (
                <div key={c.img} className="group">
                  <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white">
                    <Image src={`/images/${c.img}.png`} alt={c.t} width={300} height={650} className="w-full h-auto group-hover:scale-[1.015] transition-transform duration-300" />
                  </div>
                  <p className="mt-2 text-[12px] sm:text-[13px] font-semibold text-[#2F4366] text-center">{c.t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For Business ── */}
        <section id="business" className="py-20 px-5 border-t border-zinc-100">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: S }}>For business owners</p>
              <h2 className="text-2xl font-bold text-[#1A1A2E]">Launch a loyalty program in 5 minutes.</h2>
              <p className="text-sm text-[#8A94A6] mt-2">No hardware. Just your Android phone.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { img: "scan", t: "Scan & Stamp" },
                { img: "track_customer", t: "Live Customer Map" },
                { img: "broadcast", t: "Broadcast Messages" },
              ].map((c) => (
                <div key={c.img} className="group">
                  <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50">
                    <Image src={`/images/${c.img}.png`} alt={c.t} width={300} height={650} className="w-full h-auto group-hover:scale-[1.015] transition-transform duration-300" />
                  </div>
                  <p className="mt-2 text-[13px] font-semibold text-[#2F4366] text-center">{c.t}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {["No hardware", "5-min setup", "Analytics", "Store map", "Announcements", "Geofencing"].map((t) => (
                <span key={t} className="text-[11px] font-medium text-[#8A94A6] bg-zinc-100 rounded-full px-3.5 py-1.5 border border-zinc-200">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-20 px-5 bg-zinc-50/70 border-t border-zinc-100">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-[#1A1A2E]">Simple pricing.</h2>
              <p className="text-sm text-[#8A94A6] mt-1">Free during beta. Built for PH businesses.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { n: "Beta", p: "Free", per: "", c: "#8B5CF6", tag: "NOW", f: ["Unlimited all", "Every feature", "No card needed"] },
                { n: "Starter", p: "₱149", per: "/mo", c: S, tag: null, f: ["100 holders", "500 scans/mo", "Email support"] },
                { n: "Growth", p: "₱349", per: "/mo", c: "#27AE60", tag: "BEST", f: ["1K holders", "Unlimited scans", "Priority support"] },
                { n: "Scale", p: "₱799", per: "/mo", c: "#E67E22", tag: null, f: ["Unlimited", "Multi-branch", "API access"] },
              ].map((pl) => (
                <div key={pl.n} className={`bg-white rounded-xl p-4 sm:p-5 border relative ${pl.tag === "NOW" ? "border-[#8B5CF6] ring-1 ring-[#8B5CF6]/10" : pl.tag === "BEST" ? "border-[#27AE60] ring-1 ring-[#27AE60]/10" : "border-zinc-200"}`}>
                  {pl.tag && <span className="absolute -top-2 right-3 text-[9px] font-bold text-white px-2 py-px rounded-full" style={{ background: pl.c }}>{pl.tag}</span>}
                  <p className="text-[13px] font-bold" style={{ color: pl.c }}>{pl.n}</p>
                  <p className="mt-1"><span className="text-xl sm:text-2xl font-extrabold text-[#1A1A2E]">{pl.p}</span><span className="text-[11px] text-[#8A94A6]">{pl.per}</span></p>
                  <ul className="mt-3 space-y-1.5">
                    {pl.f.map((f) => <li key={f} className="text-[11px] text-[#8A94A6] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full shrink-0" style={{ background: pl.c }} />{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Download ── */}
        <section id="download" className="py-20 px-5 text-white border-t" style={{ background: S }}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-white/60 bg-white/10 border border-white/10 rounded-full px-3 py-1 mb-5">
              Android Beta — Scan to download
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">Get Stampworth</h2>
            <p className="text-white/50 text-sm mt-2 mb-10">Scan the QR code with your phone camera to download the APK.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* Customer */}
              <div className="bg-white rounded-2xl p-5 w-52">
                <div className="w-36 h-36 mx-auto mb-3 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" width="120" height="120"><rect width="200" height="200" fill="white"/><g fill="#2F4366"><rect x="20" y="20" width="60" height="60"/><rect x="30" y="30" width="40" height="40" fill="white"/><rect x="40" y="40" width="20" height="20"/><rect x="120" y="20" width="60" height="60"/><rect x="130" y="30" width="40" height="40" fill="white"/><rect x="140" y="40" width="20" height="20"/><rect x="20" y="120" width="60" height="60"/><rect x="30" y="130" width="40" height="40" fill="white"/><rect x="40" y="140" width="20" height="20"/><rect x="90" y="20" width="10" height="10"/><rect x="90" y="50" width="10" height="10"/><rect x="20" y="90" width="10" height="10"/><rect x="50" y="90" width="10" height="10"/><rect x="90" y="90" width="10" height="10"/><rect x="120" y="100" width="10" height="10"/><rect x="150" y="100" width="10" height="10"/><rect x="90" y="120" width="10" height="10"/><rect x="120" y="130" width="20" height="20"/><rect x="160" y="130" width="10" height="10"/><rect x="120" y="160" width="10" height="10"/><rect x="150" y="170" width="20" height="10"/></g></svg>
                </div>
                <p className="text-sm font-bold text-[#1A1A2E]">Stampworth</p>
                <p className="text-[11px] text-[#8A94A6]">For customers</p>
              </div>
              {/* Business */}
              <div className="bg-white rounded-2xl p-5 w-52">
                <div className="w-36 h-36 mx-auto mb-3 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" width="120" height="120"><rect width="200" height="200" fill="white"/><g fill="#2F4366"><rect x="20" y="20" width="60" height="60"/><rect x="30" y="30" width="40" height="40" fill="white"/><rect x="40" y="40" width="20" height="20"/><rect x="120" y="20" width="60" height="60"/><rect x="130" y="30" width="40" height="40" fill="white"/><rect x="140" y="40" width="20" height="20"/><rect x="20" y="120" width="60" height="60"/><rect x="30" y="130" width="40" height="40" fill="white"/><rect x="40" y="140" width="20" height="20"/><rect x="90" y="30" width="10" height="10"/><rect x="90" y="60" width="10" height="10"/><rect x="30" y="90" width="10" height="10"/><rect x="60" y="90" width="10" height="10"/><rect x="90" y="90" width="20" height="20"/><rect x="130" y="90" width="10" height="10"/><rect x="160" y="90" width="10" height="10"/><rect x="90" y="130" width="10" height="10"/><rect x="130" y="120" width="10" height="10"/><rect x="160" y="140" width="10" height="10"/><rect x="120" y="160" width="20" height="10"/><rect x="160" y="160" width="10" height="10"/></g></svg>
                </div>
                <p className="text-sm font-bold text-[#1A1A2E]">Stampworth Business</p>
                <p className="text-[11px] text-[#8A94A6]">For store owners</p>
              </div>
            </div>

            <p className="text-[10px] text-white/25 mt-8">QR codes will link to APK downloads once builds are published.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-zinc-100">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#8A94A6]">
          <div className="flex items-center gap-1.5">
            <Image src="/images/logo.png" alt="Logo" width={16} height={16} />
            <span className="font-semibold text-[#8A94A6]">Stampworth</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#4A5A7A]">Privacy</a>
            <a href="#" className="hover:text-[#4A5A7A]">Terms</a>
            <a href="#" className="hover:text-[#4A5A7A]">Contact</a>
          </div>
          <p className="text-[#C4CAD4]">© 2026 Stampworth</p>
        </div>
      </footer>
    </>
  );
}
