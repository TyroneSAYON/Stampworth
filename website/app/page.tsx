import Image from "next/image";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="Stampworth" width={32} height={32} />
            <span className="text-lg font-bold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#for-customers" className="hover:text-zinc-900 transition-colors">For Customers</a>
            <a href="#for-business" className="hover:text-zinc-900 transition-colors">For Business</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
          </div>
          <a href="#download" className="bg-[#2F4366] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#243552] transition-colors">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Now in Beta — Free for all businesses
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-900 leading-tight max-w-3xl mx-auto">
            Your Virtual <span className="text-[#2F4366]">Loyalty Card</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Replace paper stamp cards with a simple QR code. Customers earn rewards digitally, businesses grow repeat visits. Made for Filipino SMEs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a href="#download" className="bg-[#2F4366] text-white text-base font-semibold px-8 py-3.5 rounded-2xl hover:bg-[#243552] transition-all shadow-lg shadow-[#2F4366]/20">
              Download Stampworth
            </a>
            <a href="#for-business" className="bg-white text-zinc-700 text-base font-semibold px-8 py-3.5 rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all">
              For Business Owners
            </a>
          </div>
          <div className="mt-16 max-w-xs mx-auto">
            <Image src="/images/qrcode.png" alt="Stampworth QR Code" width={400} height={800} className="rounded-3xl shadow-2xl shadow-zinc-900/10 border border-zinc-200" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#2F4366] uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">Simple. Fast. Rewarding.</h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto">Three steps to replace paper loyalty cards forever</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Scan QR Code", desc: "Customer shows their QR code, merchant scans it with the Stampworth Business app.", icon: "📱" },
              { step: "2", title: "Earn Stamps", desc: "Each visit earns a digital stamp. Track progress in real-time from your phone.", icon: "⭐" },
              { step: "3", title: "Claim Rewards", desc: "When the card is full, the customer gets a free reward. Automatically.", icon: "🎁" },
            ].map((item) => (
              <div key={item.step} className="bg-zinc-50 rounded-2xl p-8 text-center border border-zinc-100 hover:border-zinc-200 transition-colors">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#2F4366] text-white text-sm font-bold mb-4">{item.step}</div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{item.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Customers */}
      <section id="for-customers" className="py-24 px-6 bg-gradient-to-b from-zinc-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">For Customers</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">All your loyalty cards in one app</h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto">No more lost paper cards. Earn stamps and track rewards from your phone.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { img: "/images/cards.png", title: "Digital Loyalty Cards", desc: "All your stamp cards from different stores in one place" },
              { img: "/images/qrcode.png", title: "One QR Code", desc: "Show your QR code at any Stampworth partner store" },
              { img: "/images/map.png", title: "Discover Stores", desc: "Find nearby Stampworth businesses on the map" },
              { img: "/images/nearby.png", title: "Nearby Alerts", desc: "Get notified when you are near a partner store" },
              { img: "/images/notification.png", title: "Stay Updated", desc: "Receive announcements from your favourite stores" },
              { img: "/images/view.png", title: "Track Rewards", desc: "See your stamp progress and claim free rewards" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg hover:shadow-zinc-100 transition-all group">
                <div className="aspect-[9/16] max-h-[320px] overflow-hidden bg-zinc-100">
                  <Image src={item.img} alt={item.title} width={300} height={600} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-zinc-900">{item.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Business */}
      <section id="for-business" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#2F4366] uppercase tracking-wider mb-3">For Business Owners</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">Launch your loyalty program in 5 minutes</h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto">No hardware needed. Just your phone and the Stampworth Business app.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { img: "/images/scan.png", title: "Scan & Stamp", desc: "Scan customer QR codes and give stamps instantly" },
              { img: "/images/track_customer.png", title: "Track Customers", desc: "See nearby customers on a live map with geofencing" },
              { img: "/images/broadcast.png", title: "Broadcast Messages", desc: "Send announcements to all your loyalty card holders" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg hover:shadow-zinc-100 transition-all group">
                <div className="aspect-[9/16] max-h-[320px] overflow-hidden bg-zinc-100">
                  <Image src={item.img} alt={item.title} width={300} height={600} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-zinc-900">{item.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 bg-[#2F4366] rounded-2xl p-8 sm:p-12 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">Why businesses love Stampworth</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[
                { icon: "📱", label: "No hardware needed" },
                { icon: "⚡", label: "Set up in 5 minutes" },
                { icon: "📊", label: "Real-time analytics" },
                { icon: "🗺️", label: "Store map listing" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-sm font-medium text-white/80">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#2F4366] uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">Plans made for Filipino SMEs</h2>
            <p className="text-zinc-500 mt-4">Free during beta. Affordable plans after.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Beta", price: "Free", period: "during beta", color: "#8B5CF6", features: ["Unlimited everything", "All features unlocked", "No credit card needed"], cta: "Join Beta", highlight: true },
              { name: "Starter", price: "₱149", period: "/month", color: "#2F4366", features: ["100 card holders", "500 scans/month", "10 announcements", "Email support"], cta: "Coming Soon", highlight: false },
              { name: "Growth", price: "₱349", period: "/month", color: "#27AE60", features: ["1,000 card holders", "Unlimited scans", "Custom card design", "Priority support"], cta: "Coming Soon", highlight: false },
              { name: "Scale", price: "₱799", period: "/month", color: "#E67E22", features: ["Unlimited everything", "Multi-branch", "API access", "Dedicated manager"], cta: "Coming Soon", highlight: false },
            ].map((plan) => (
              <div key={plan.name} className={`bg-white rounded-2xl p-6 border-2 ${plan.highlight ? "border-[#8B5CF6] shadow-lg shadow-purple-100" : "border-zinc-200"} relative`}>
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-xs font-bold px-4 py-1 rounded-full">CURRENT</div>}
                <h3 className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-zinc-900">{plan.price}</span>
                  <span className="text-sm text-zinc-400">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full mt-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? "bg-[#8B5CF6] text-white hover:bg-[#7C3AED]" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <Image src="/images/logo.png" alt="Stampworth" width={64} height={64} className="mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">Ready to go digital?</h2>
          <p className="text-zinc-500 mb-10 text-lg">Download Stampworth and start earning or giving rewards today.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="flex items-center gap-3 bg-zinc-900 text-white px-6 py-3.5 rounded-2xl hover:bg-zinc-800 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.61 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z"/></svg>
              <div className="text-left"><p className="text-[10px] text-white/60">GET IT ON</p><p className="text-sm font-semibold">Google Play</p></div>
            </a>
            <a href="#" className="flex items-center gap-3 bg-zinc-900 text-white px-6 py-3.5 rounded-2xl hover:bg-zinc-800 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.82 11.78 5.72 12.57 5.72C13.36 5.72 14.85 4.62 16.41 4.8C17.07 4.83 18.89 5.08 20.02 6.78C19.93 6.84 17.66 8.14 17.69 10.98C17.72 14.38 20.59 15.49 20.63 15.51C20.59 15.62 20.14 17.16 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
              <div className="text-left"><p className="text-[10px] text-white/60">Download on the</p><p className="text-sm font-semibold">App Store</p></div>
            </a>
          </div>
          <div className="mt-8">
            <a href="#" className="inline-flex items-center gap-2 text-[#2F4366] font-semibold text-sm hover:underline">
              <Image src="/images/logo-business.png" alt="Business" width={20} height={20} />
              Download Stampworth Business
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Stampworth" width={24} height={24} />
            <span className="text-sm font-semibold text-zinc-600">Stampworth</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <a href="#" className="hover:text-zinc-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-600 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-zinc-400">© 2026 Stampworth. Made in the Philippines.</p>
        </div>
      </footer>
    </main>
  );
}
