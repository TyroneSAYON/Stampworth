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
            <a href="#pricing" className="hover:text-[#2F4366] transition">Pricing</a>
          </div>
          <a href="#download" className="text-[13px] font-semibold text-white bg-[#2F4366] px-4 py-2 rounded-lg hover:bg-[#243552] transition">Download</a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 px-5">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-6">Beta Testing — Android</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A2E] leading-tight">
              Your virtual loyalty card.
            </h1>
            <p className="text-[#8A94A6] mt-3 max-w-lg mx-auto leading-relaxed">
              Replace paper stamp cards with a simple QR code on your phone.
              Customers earn rewards. Businesses grow repeat visits. Made for Filipino SMEs.
            </p>
            <div className="flex justify-center gap-3 mt-7">
              <a href="#download" className="text-white text-sm font-semibold bg-[#2F4366] px-6 py-2.5 rounded-xl hover:bg-[#243552] transition">Download APK</a>
              <a href="#how" className="text-sm font-semibold text-[#2F4366] px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition">Learn more</a>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-16 px-5 border-t border-zinc-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-[#1A1A2E] text-center mb-10">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              {[
                { n: "1", t: "Show your QR code", d: "Open Stampworth and present your personal QR code at the counter." },
                { n: "2", t: "Earn stamps", d: "The merchant scans your QR code with the Business app. You get a digital stamp." },
                { n: "3", t: "Claim your reward", d: "When your card is full, you automatically receive a free reward from the store." },
              ].map((s) => (
                <div key={s.n}>
                  <div className="w-8 h-8 rounded-full bg-[#2F4366] text-white text-sm font-bold flex items-center justify-center mx-auto mb-3">{s.n}</div>
                  <h3 className="text-sm font-semibold text-[#1A1A2E]">{s.t}</h3>
                  <p className="text-[13px] text-[#8A94A6] mt-1 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Customers */}
        <section id="customers" className="py-16 px-5 bg-zinc-50 border-t border-zinc-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1">For customers</p>
              <h2 className="text-lg font-bold text-[#1A1A2E]">Everything you need in one app.</h2>
              <p className="text-[13px] text-[#8A94A6] mt-1">No more lost paper cards. No more forgotten stamps.</p>
            </div>

            {/* QR Code + Cards */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A94A6] mb-3">Your identity & cards</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Image src="/images/qrcode.png" alt="QR Code" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Personal QR Code</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">One QR for all stores. Works offline.</p>
                </div>
                <div>
                  <Image src="/images/cards.png" alt="Loyalty Cards" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Loyalty Cards</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">All stamp cards in one place.</p>
                </div>
              </div>
            </div>

            {/* Rewards + Notifications */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A94A6] mb-3">Rewards & updates</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Image src="/images/view.png" alt="Track Rewards" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Track Rewards</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">See stamp progress. Claim free rewards.</p>
                </div>
                <div>
                  <Image src="/images/notification.png" alt="Notifications" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Notifications</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">Announcements from your favourite stores.</p>
                </div>
              </div>
            </div>

            {/* Map + Nearby */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A94A6] mb-3">Discovery</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Image src="/images/map.png" alt="Store Map" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Store Map</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">Find nearby Stampworth businesses.</p>
                </div>
                <div>
                  <Image src="/images/nearby.png" alt="Nearby Alerts" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Nearby Alerts</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">Get notified when near a partner store.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Business */}
        <section id="business" className="py-16 px-5 border-t border-zinc-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#2F4366] mb-1">For business owners</p>
              <h2 className="text-lg font-bold text-[#1A1A2E]">Launch a digital loyalty program in minutes.</h2>
              <p className="text-[13px] text-[#8A94A6] mt-1">No hardware needed. No monthly fees during beta. Just your Android phone.</p>
            </div>

            {/* Scanning */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A94A6] mb-3">Stamp customers</p>
              <div className="max-w-xs mx-auto">
                <Image src="/images/scan.png" alt="Scan & Stamp" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Scan & Stamp</p>
                <p className="text-[11px] text-[#8A94A6] text-center">Point your camera at the customer's QR code. Stamp given instantly.</p>
              </div>
            </div>

            {/* Track + Broadcast */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A94A6] mb-3">Engage & grow</p>
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                <div>
                  <Image src="/images/track_customer.png" alt="Live Tracking" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Live Customer Map</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">See who's nearby in real time.</p>
                </div>
                <div>
                  <Image src="/images/broadcast.png" alt="Broadcast" width={300} height={650} className="w-full rounded-xl border border-zinc-200" />
                  <p className="mt-2 text-[12px] font-semibold text-[#2F4366] text-center">Broadcast Messages</p>
                  <p className="text-[11px] text-[#8A94A6] text-center">Message all your card holders at once.</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-10 bg-[#2F4366] rounded-xl p-6 sm:p-8 text-center text-white">
              <h3 className="font-bold mb-4">Why businesses choose Stampworth</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px] text-white/70">
                {[
                  "No hardware or tablets",
                  "Set up in 5 minutes",
                  "Real-time stamp tracking",
                  "Customer analytics",
                  "Store map listing",
                  "Geofenced alerts",
                ].map((t) => (
                  <div key={t} className="bg-white/10 rounded-lg py-2 px-3">{t}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 px-5 bg-zinc-50 border-t border-zinc-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-[#1A1A2E] text-center mb-2">Pricing</h2>
            <p className="text-[13px] text-[#8A94A6] text-center mb-10">Free during beta. Plans built for Philippine SMEs and startups.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { n: "Beta", p: "Free", per: "", c: "#8B5CF6", active: true, f: ["Unlimited everything", "All features unlocked", "No credit card required"] },
                { n: "Starter", p: "₱149", per: "/mo", c: "#2F4366", active: false, f: ["Up to 100 card holders", "500 QR scans per month", "10 announcements per month", "Email support"] },
                { n: "Growth", p: "₱349", per: "/mo", c: "#27AE60", active: false, f: ["Up to 1,000 card holders", "Unlimited QR scans", "Custom card design", "Priority support"] },
                { n: "Scale", p: "₱799", per: "/mo", c: "#E67E22", active: false, f: ["Unlimited card holders", "Multi-branch support", "API access", "Dedicated account manager"] },
              ].map((pl) => (
                <div key={pl.n} className={`bg-white rounded-xl p-4 border ${pl.active ? "border-[#8B5CF6]" : "border-zinc-200"}`}>
                  {pl.active && <p className="text-[9px] font-bold text-[#8B5CF6] uppercase tracking-wider mb-1">Current plan</p>}
                  <p className="text-sm font-bold" style={{ color: pl.c }}>{pl.n}</p>
                  <p className="mt-1"><span className="text-xl font-extrabold text-[#1A1A2E]">{pl.p}</span><span className="text-[11px] text-[#8A94A6]">{pl.per}</span></p>
                  <ul className="mt-3 space-y-1.5">
                    {pl.f.map((f) => <li key={f} className="text-[11px] text-[#8A94A6] flex items-start gap-1.5"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: pl.c }} />{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Download */}
        <section id="download" className="py-16 px-5 bg-[#2F4366] text-white">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-4">Android Beta</p>
            <h2 className="text-xl font-bold mb-2">Download Stampworth</h2>
            <p className="text-white/50 text-sm mb-10">Scan the QR code with your phone camera to get the APK.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {[
                { label: "Stampworth", sub: "For customers", logo: "/images/logo.png" },
                { label: "Stampworth Business", sub: "For store owners", logo: "/images/logo-business.png" },
              ].map((app) => (
                <div key={app.label} className="bg-white rounded-xl p-5 w-44">
                  <div className="w-28 h-28 mx-auto mb-3 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" width="100" height="100"><rect width="200" height="200" fill="white"/><g fill="#2F4366"><rect x="20" y="20" width="60" height="60"/><rect x="30" y="30" width="40" height="40" fill="white"/><rect x="40" y="40" width="20" height="20"/><rect x="120" y="20" width="60" height="60"/><rect x="130" y="30" width="40" height="40" fill="white"/><rect x="140" y="40" width="20" height="20"/><rect x="20" y="120" width="60" height="60"/><rect x="30" y="130" width="40" height="40" fill="white"/><rect x="40" y="140" width="20" height="20"/><rect x="90" y="20" width="10" height="10"/><rect x="90" y="50" width="10" height="10"/><rect x="20" y="90" width="10" height="10"/><rect x="50" y="90" width="10" height="10"/><rect x="90" y="90" width="10" height="10"/><rect x="120" y="100" width="10" height="10"/><rect x="150" y="100" width="10" height="10"/><rect x="90" y="120" width="10" height="10"/><rect x="120" y="130" width="20" height="20"/><rect x="160" y="130" width="10" height="10"/><rect x="120" y="160" width="10" height="10"/><rect x="150" y="170" width="20" height="10"/></g></svg>
                  </div>
                  <Image src={app.logo} alt={app.label} width={18} height={18} className="mx-auto mb-1" />
                  <p className="text-[13px] font-bold text-[#1A1A2E]">{app.label}</p>
                  <p className="text-[10px] text-[#8A94A6]">{app.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#8A94A6]">
          <div className="flex items-center gap-1.5">
            <Image src="/images/logo.png" alt="Logo" width={14} height={14} />
            <span className="font-semibold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2F4366]">Privacy</a>
            <a href="#" className="hover:text-[#2F4366]">Terms</a>
            <a href="#" className="hover:text-[#2F4366]">Contact</a>
          </div>
          <p className="text-[#C4CAD4]">© 2026 Stampworth. Made in the Philippines.</p>
        </div>
      </footer>
    </>
  );
}
