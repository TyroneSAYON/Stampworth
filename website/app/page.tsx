import Image from "next/image";

export default function Home() {
  return (
    <main>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Stampworth" width={28} height={28} />
            <span className="text-base font-bold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#customers" className="hover:text-zinc-900 transition-colors">Customers</a>
            <a href="#business" className="hover:text-zinc-900 transition-colors">Business</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
          </div>
          <a href="#download" className="bg-[#2F4366] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#243552] transition-colors">
            Download
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[12px] font-semibold text-amber-700 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Beta Testing — Android Only
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 leading-[1.1] tracking-tight">
              Your virtual<br />loyalty card.
            </h1>
            <p className="text-base text-zinc-500 mt-5 leading-relaxed max-w-lg">
              Replace paper stamp cards with a QR code on your phone. Earn rewards digitally. Made for Filipino businesses.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <a href="#download" className="bg-[#2F4366] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#243552] transition-colors">
                Download APK
              </a>
              <a href="#business" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                For business owners →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* App preview */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["qrcode", "cards", "map", "view"].map((name) => (
              <div key={name} className="rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50">
                <Image src={`/images/${name}.png`} alt={name} width={360} height={780} className="w-full h-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="py-20 px-6 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-[12px] font-semibold text-[#2F4366] uppercase tracking-widest mb-2">How it works</p>
          <h2 className="text-2xl font-bold text-zinc-900 mb-10">Three steps. No paper.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", title: "Show QR", desc: "Open the app and show your QR code at the counter." },
              { n: "02", title: "Get stamped", desc: "The merchant scans your code. You earn a digital stamp." },
              { n: "03", title: "Claim reward", desc: "When your card is full, your free reward is ready." },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="text-3xl font-extrabold text-zinc-200">{s.n}</span>
                <div>
                  <h3 className="font-bold text-zinc-900">{s.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Customers */}
      <section id="customers" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[12px] font-semibold text-emerald-600 uppercase tracking-widest mb-2">For customers</p>
          <h2 className="text-2xl font-bold text-zinc-900 mb-10">All your stamp cards in one app.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { img: "cards", title: "Loyalty Cards", desc: "Every store's card in one place." },
              { img: "qrcode", title: "One QR Code", desc: "Works at any Stampworth partner." },
              { img: "map", title: "Discover Stores", desc: "Find nearby businesses on the map." },
              { img: "nearby", title: "Nearby Alerts", desc: "Notified when near a partner store." },
              { img: "notification", title: "Announcements", desc: "Updates from your favourite stores." },
              { img: "view", title: "Track Rewards", desc: "See your progress, claim rewards." },
            ].map((item) => (
              <div key={item.title} className="group">
                <div className="rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 mb-3">
                  <Image src={`/images/${item.img}.png`} alt={item.title} width={360} height={780} className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">{item.title}</h3>
                <p className="text-[13px] text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Business */}
      <section id="business" className="py-20 px-6 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-[12px] font-semibold text-[#2F4366] uppercase tracking-widest mb-2">For business owners</p>
          <h2 className="text-2xl font-bold text-zinc-900 mb-3">Launch your loyalty program in 5 minutes.</h2>
          <p className="text-sm text-zinc-500 mb-10 max-w-lg">No hardware. No tablets. Just your Android phone and the Stampworth Business app.</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { img: "scan", title: "Scan & Stamp", desc: "Scan QR codes to give stamps instantly." },
              { img: "track_customer", title: "Live Tracking", desc: "See nearby customers on a live map." },
              { img: "broadcast", title: "Broadcast", desc: "Message all your card holders at once." },
            ].map((item) => (
              <div key={item.title} className="group">
                <div className="rounded-xl overflow-hidden border border-zinc-200 bg-white mb-3">
                  <Image src={`/images/${item.img}.png`} alt={item.title} width={360} height={780} className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">{item.title}</h3>
                <p className="text-[13px] text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              "No hardware needed",
              "5-minute setup",
              "Real-time analytics",
              "Store map listing",
            ].map((label) => (
              <div key={label} className="bg-white rounded-lg border border-zinc-200 px-4 py-3 text-center">
                <p className="text-[13px] font-medium text-zinc-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[12px] font-semibold text-[#2F4366] uppercase tracking-widest mb-2">Pricing</p>
          <h2 className="text-2xl font-bold text-zinc-900 mb-10">Made for Filipino SMEs.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Beta", price: "Free", period: "", color: "#8B5CF6", tag: "NOW", features: ["Unlimited everything", "All features", "No credit card"] },
              { name: "Starter", price: "₱149", period: "/mo", color: "#2F4366", tag: null, features: ["100 card holders", "500 scans/mo", "Email support"] },
              { name: "Growth", price: "₱349", period: "/mo", color: "#27AE60", tag: "BEST", features: ["1,000 holders", "Unlimited scans", "Priority support"] },
              { name: "Scale", price: "₱799", period: "/mo", color: "#E67E22", tag: null, features: ["Unlimited all", "Multi-branch", "API access"] },
            ].map((plan) => (
              <div key={plan.name} className={`bg-white rounded-xl p-5 border ${plan.tag === "NOW" ? "border-[#8B5CF6] ring-1 ring-[#8B5CF6]/20" : plan.tag === "BEST" ? "border-[#27AE60] ring-1 ring-[#27AE60]/20" : "border-zinc-200"} relative`}>
                {plan.tag && <span className="absolute -top-2.5 right-4 text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full" style={{ backgroundColor: plan.color }}>{plan.tag}</span>}
                <p className="text-sm font-bold" style={{ color: plan.color }}>{plan.name}</p>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{plan.price}</span>
                  <span className="text-[12px] text-zinc-400">{plan.period}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="py-20 px-6 bg-[#2F4366]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-[12px] font-semibold text-white/80 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Android Beta — Scan to download
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Download Stampworth</h2>
          <p className="text-white/60 text-sm mb-10">Currently in beta testing for Android. Scan the QR code to download the APK.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            {/* Customer App QR */}
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="w-40 h-40 bg-zinc-100 rounded-xl flex items-center justify-center mb-3 mx-auto border border-zinc-200">
                {/* Dummy QR — replace with real download link QR */}
                <svg viewBox="0 0 200 200" width="140" height="140">
                  <rect width="200" height="200" fill="white"/>
                  <g fill="#2F4366">
                    <rect x="20" y="20" width="60" height="60"/><rect width="40" height="40" x="30" y="30" fill="white"/><rect x="40" y="40" width="20" height="20"/>
                    <rect x="120" y="20" width="60" height="60"/><rect width="40" height="40" x="130" y="30" fill="white"/><rect x="140" y="40" width="20" height="20"/>
                    <rect x="20" y="120" width="60" height="60"/><rect width="40" height="40" x="30" y="130" fill="white"/><rect x="40" y="140" width="20" height="20"/>
                    <rect x="90" y="20" width="10" height="10"/><rect x="90" y="40" width="10" height="10"/><rect x="90" y="60" width="10" height="10"/>
                    <rect x="20" y="90" width="10" height="10"/><rect x="40" y="90" width="10" height="10"/><rect x="60" y="90" width="10" height="10"/>
                    <rect x="90" y="90" width="10" height="10"/><rect x="110" y="90" width="10" height="10"/>
                    <rect x="120" y="100" width="10" height="10"/><rect x="140" y="100" width="10" height="10"/><rect x="160" y="100" width="10" height="10"/>
                    <rect x="90" y="110" width="10" height="10"/><rect x="90" y="130" width="10" height="10"/>
                    <rect x="120" y="120" width="20" height="20"/><rect x="150" y="120" width="10" height="10"/><rect x="170" y="120" width="10" height="10"/>
                    <rect x="120" y="150" width="10" height="10"/><rect x="140" y="150" width="10" height="10"/><rect x="160" y="150" width="10" height="10"/>
                    <rect x="120" y="170" width="10" height="10"/><rect x="150" y="170" width="10" height="10"/>
                  </g>
                </svg>
              </div>
              <Image src="/images/logo.png" alt="Stampworth" width={24} height={24} className="mx-auto mb-1" />
              <p className="text-sm font-bold text-zinc-900">Stampworth</p>
              <p className="text-[11px] text-zinc-400">For customers</p>
            </div>
            {/* Business App QR */}
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="w-40 h-40 bg-zinc-100 rounded-xl flex items-center justify-center mb-3 mx-auto border border-zinc-200">
                <svg viewBox="0 0 200 200" width="140" height="140">
                  <rect width="200" height="200" fill="white"/>
                  <g fill="#2F4366">
                    <rect x="20" y="20" width="60" height="60"/><rect width="40" height="40" x="30" y="30" fill="white"/><rect x="40" y="40" width="20" height="20"/>
                    <rect x="120" y="20" width="60" height="60"/><rect width="40" height="40" x="130" y="30" fill="white"/><rect x="140" y="40" width="20" height="20"/>
                    <rect x="20" y="120" width="60" height="60"/><rect width="40" height="40" x="30" y="130" fill="white"/><rect x="40" y="140" width="20" height="20"/>
                    <rect x="90" y="30" width="10" height="10"/><rect x="90" y="50" width="10" height="10"/><rect x="90" y="70" width="10" height="10"/>
                    <rect x="30" y="90" width="10" height="10"/><rect x="50" y="90" width="10" height="10"/><rect x="70" y="90" width="10" height="10"/>
                    <rect x="90" y="90" width="20" height="20"/><rect x="120" y="90" width="10" height="10"/>
                    <rect x="150" y="90" width="10" height="10"/><rect x="170" y="90" width="10" height="10"/>
                    <rect x="90" y="120" width="10" height="10"/><rect x="90" y="140" width="10" height="10"/><rect x="90" y="160" width="10" height="10"/>
                    <rect x="130" y="120" width="10" height="10"/><rect x="150" y="130" width="10" height="10"/><rect x="170" y="140" width="10" height="10"/>
                    <rect x="120" y="160" width="20" height="10"/><rect x="150" y="160" width="20" height="10"/>
                  </g>
                </svg>
              </div>
              <Image src="/images/logo-business.png" alt="Stampworth Business" width={24} height={24} className="mx-auto mb-1" />
              <p className="text-sm font-bold text-zinc-900">Stampworth Business</p>
              <p className="text-[11px] text-zinc-400">For store owners</p>
            </div>
          </div>
          <p className="text-[11px] text-white/30 mt-8">QR codes will link to APK downloads once beta builds are ready.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Stampworth" width={20} height={20} />
            <span className="text-sm font-semibold text-zinc-500">Stampworth</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-zinc-400">
            <a href="#" className="hover:text-zinc-600">Privacy</a>
            <a href="#" className="hover:text-zinc-600">Terms</a>
            <a href="#" className="hover:text-zinc-600">Contact</a>
          </div>
          <p className="text-[11px] text-zinc-300">© 2026 Stampworth. Philippines.</p>
        </div>
      </footer>
    </main>
  );
}
