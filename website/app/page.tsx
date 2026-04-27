import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="Stampworth" width={32} height={32} />
            <span className="text-lg font-bold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8A94A6]">
            <a href="#features" className="hover:text-[#2F4366] transition">Features</a>
            <a href="#customers" className="hover:text-[#2F4366] transition">For Customers</a>
            <a href="#business" className="hover:text-[#2F4366] transition">For Business</a>
            <a href="#pricing" className="hover:text-[#2F4366] transition">Pricing</a>
          </div>
          <a href="#download" className="bg-[#2F4366] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#243552] transition">
            Get Started
          </a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-blue-50/60 to-white">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-medium text-[#8A94A6] mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Beta Testing — Android Only
            </div>
            <h1 className="max-w-3xl mx-auto">
              <span className="block text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#2F4366]">Stampworth</span>
              <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A1A2E] mt-2">Your Virtual Loyalty Card</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#8A94A6] mt-6 max-w-2xl mx-auto leading-relaxed">
              Replace paper stamp cards with a simple QR code on your phone. Customers earn rewards digitally, businesses grow repeat visits. Made for Filipino SMEs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <a href="https://drive.google.com/drive/folders/1w0cLzPnKykE_H5OFHgysPbtGm3ytCzvd?usp=drive_link" target="_blank" rel="noopener noreferrer" className="bg-[#2F4366] text-white text-base font-semibold px-8 py-3.5 rounded-2xl hover:bg-[#243552] transition shadow-lg shadow-[#2F4366]/20">
                Download APK
              </a>
              <a href="#business" className="bg-white text-[#2F4366] text-base font-semibold px-8 py-3.5 rounded-2xl border border-zinc-200 hover:bg-zinc-50 transition">
                For Business Owners
              </a>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="features" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-[#2F4366] uppercase tracking-wider mb-3">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">Simple. Fast. Rewarding.</h2>
              <p className="text-[#8A94A6] mt-4 max-w-xl mx-auto">Three steps to replace paper loyalty cards forever</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Scan QR Code", desc: "Customer shows their QR code, merchant scans it with the Stampworth Business app." },
                { step: "2", title: "Earn Stamps", desc: "Each visit earns a digital stamp. Track progress in real-time from your phone." },
                { step: "3", title: "Claim Rewards", desc: "When the card is full, the customer gets a free reward. Automatically." },
              ].map((item) => (
                <div key={item.step} className="bg-zinc-50 rounded-2xl p-8 text-center border border-zinc-100">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#2F4366] text-white text-sm font-bold mb-4">{item.step}</div>
                  <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{item.title}</h3>
                  <p className="text-[#8A94A6] text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Customers */}
        <section id="customers" className="py-24 px-6 bg-gradient-to-b from-zinc-50 to-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">For Customers</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">All your loyalty cards in one app</h2>
              <p className="text-[#8A94A6] mt-4 max-w-xl mx-auto">No more lost paper cards. Earn stamps and track rewards from your phone.</p>
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
                <div key={item.title} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-zinc-100">
                    <Image src={item.img} alt={item.title} width={300} height={600} className="w-full" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#1A1A2E]">{item.title}</h3>
                    <p className="text-sm text-[#8A94A6] mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Business */}
        <section id="business" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-[#2F4366] uppercase tracking-wider mb-3">For Business Owners</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">Launch your loyalty program in 5 minutes</h2>
              <p className="text-[#8A94A6] mt-4 max-w-xl mx-auto">No hardware needed. Just your phone and the Stampworth Business app.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { img: "/images/scan.png", title: "Scan & Stamp", desc: "Scan customer QR codes and give stamps instantly" },
                { img: "/images/track_customer.png", title: "Track Customers", desc: "See nearby customers on a live map with geofencing" },
                { img: "/images/broadcast.png", title: "Broadcast Messages", desc: "Send announcements to all your loyalty card holders" },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-zinc-100">
                    <Image src={item.img} alt={item.title} width={300} height={600} className="w-full" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#1A1A2E]">{item.title}</h3>
                    <p className="text-sm text-[#8A94A6] mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 bg-[#2F4366] rounded-2xl p-8 sm:p-12 text-center text-white">
              <h3 className="text-2xl font-bold mb-6">Why businesses love Stampworth</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {["No hardware needed", "Set up in 5 minutes", "Real-time analytics", "Store map listing"].map((t) => (
                  <div key={t} className="bg-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white/80">{t}</div>
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
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">Plans made for Filipino SMEs</h2>
              <p className="text-[#8A94A6] mt-4">Free during beta. Affordable plans after.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Beta", price: "Free", period: "during beta", color: "#8B5CF6", current: true, features: ["Unlimited everything", "All features unlocked", "No credit card needed"] },
                { name: "Starter", price: "₱149", period: "/month", color: "#2F4366", current: false, features: ["100 card holders", "500 scans/month", "10 announcements", "Email support"] },
                { name: "Growth", price: "₱349", period: "/month", color: "#27AE60", current: false, features: ["1,000 card holders", "Unlimited scans", "Custom card design", "Priority support"] },
                { name: "Scale", price: "₱799", period: "/month", color: "#E67E22", current: false, features: ["Unlimited everything", "Multi-branch", "API access", "Dedicated manager"] },
              ].map((plan) => (
                <div key={plan.name} className={`bg-white rounded-2xl p-6 border-2 ${plan.current ? "border-[#8B5CF6] shadow-lg shadow-purple-100" : "border-zinc-200"} relative`}>
                  {plan.current && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-xs font-bold px-4 py-1 rounded-full">CURRENT</div>}
                  <h3 className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-[#1A1A2E]">{plan.price}</span>
                    <span className="text-sm text-[#8A94A6]">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[#4A5A7A]">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
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
        <section id="download" className="py-24 px-6 bg-[#2F4366]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Android Beta</p>
              <h2 className="text-3xl font-bold text-white mb-2">Download Stampworth</h2>
              <p className="text-white/50">Get the APK and start earning or giving rewards today.</p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* QR side */}
              <div className="shrink-0">
                <div className="bg-white rounded-xl p-4">
                  <Image src="/images/download-qr.png" alt="Download QR Code" width={180} height={180} className="rounded-lg" />
                </div>
                <p className="text-[11px] text-white/40 text-center mt-3">Scan with your phone camera</p>
              </div>

              {/* Info side */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">Scan or download directly</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-6">
                  The folder contains both APK files — <span className="text-white/70 font-medium">Stampworth</span> for customers
                  and <span className="text-white/70 font-medium">Stampworth Business</span> for store owners. Install on any Android device.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-6">
                  <a
                    href="https://drive.google.com/drive/folders/1w0cLzPnKykE_H5OFHgysPbtGm3ytCzvd?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white text-[#2F4366] text-sm font-semibold px-6 py-3 rounded-xl hover:bg-zinc-100 transition"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download from Google Drive
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                    <Image src="/images/logo.png" alt="Customer" width={16} height={16} />
                    <span className="text-[12px] text-white/60 font-medium">Stampworth</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                    <Image src="/images/logo-business.png" alt="Business" width={16} height={16} />
                    <span className="text-[12px] text-white/60 font-medium">Stampworth Business</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Stampworth" width={24} height={24} />
            <span className="text-sm font-semibold text-[#2F4366]">Stampworth</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#8A94A6]">
            <a href="#" className="hover:text-[#2F4366] transition">Privacy Policy</a>
            <a href="#" className="hover:text-[#2F4366] transition">Terms of Service</a>
            <a href="#" className="hover:text-[#2F4366] transition">Contact</a>
          </div>
          <p className="text-xs text-[#C4CAD4]">© 2026 Stampworth. Made in the Philippines.</p>
        </div>
      </footer>
    </>
  );
}
