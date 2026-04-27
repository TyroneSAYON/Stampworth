import Image from "next/image";
import Link from "next/link";

export default function Terms() {
  return (
    <>
      <nav className="bg-white border-b border-zinc-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between h-14 px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Stampworth" width={24} height={24} />
            <span className="font-bold text-[#2F4366]">Stampworth</span>
          </Link>
          <Link href="/" className="text-sm text-[#8A94A6] hover:text-[#2F4366] transition">Back to Home</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#8A94A6] mb-10">Last updated: April 2026</p>

        <div className="prose prose-zinc max-w-none text-[#4A5A7A] leading-relaxed space-y-6 text-[15px]">
          <h2 className="text-lg font-bold text-[#1A1A2E]">1. Acceptance of Terms</h2>
          <p>By using the Stampworth Loyalty Card system, you agree to these Terms of Service, which govern your access and use of the Stampworth application and its QR-based loyalty features, including the creation and use of a unique QR code, stamp tracking, and reward redemption.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">2. Account Responsibilities</h2>
          <p>You agree to provide accurate information, keep your account and QR code secure, and use the system only for lawful and legitimate purposes. You are responsible for maintaining the confidentiality of your account credentials.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">3. Rewards & Stamps</h2>
          <p>Rewards, stamps, and promotions are managed and determined by participating partner businesses. Stampworth is not responsible for disputes, changes, or cancellations of offers made by individual merchants. Reward availability and terms are at the discretion of each business.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">4. QR Code Usage</h2>
          <p>Each user is assigned a unique QR code for identification within the Stampworth system. Sharing, duplicating, or tampering with QR codes for fraudulent purposes is strictly prohibited and may result in account termination.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">5. Location Services</h2>
          <p>Stampworth uses location data to provide geofencing features, nearby store alerts, and store map functionality. Location data is only collected when you are within range of a Stampworth partner store. Your location is never tracked outside of geofence zones.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">6. Business Accounts</h2>
          <p>Business owners who use Stampworth Business agree to use the platform responsibly, provide accurate business information, and respect customer privacy. Businesses are responsible for the accuracy of their loyalty card configurations, reward descriptions, and announcements.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">7. Subscription Plans</h2>
          <p>Stampworth offers subscription plans for businesses (Starter, Growth, Scale). During the beta testing period, all features are available for free. Plan features and pricing are subject to change. Sandbox payments do not involve real financial transactions.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">8. Termination</h2>
          <p>Stampworth reserves the right to modify, suspend, or terminate any account or access to the system at any time if there is suspected misuse, fraud, or violation of these Terms. Users may delete their account at any time through the app settings.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">9. Changes to Terms</h2>
          <p>By continuing to use the Stampworth Loyalty Card system, you agree to comply with all updates to these Terms of Service. We will notify users of significant changes through the app.</p>
        </div>
      </main>
      <footer className="border-t border-zinc-200 py-8 px-6 bg-zinc-50">
        <div className="max-w-3xl mx-auto text-center text-xs text-[#C4CAD4]">© 2026 Stampworth. All rights reserved.</div>
      </footer>
    </>
  );
}
