import Image from "next/image";
import Link from "next/link";

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#8A94A6] mb-10">Last updated: April 2026</p>

        <div className="prose prose-zinc max-w-none text-[#4A5A7A] leading-relaxed space-y-6 text-[15px]">
          <h2 className="text-lg font-bold text-[#1A1A2E]">1. Information We Collect</h2>
          <p>We collect personal data such as your name, email address, account information, QR code data, and usage activity to enable loyalty features like stamp tracking and reward management. For business accounts, we also collect business name, address, logo, and store location.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">2. How We Use Your Information</h2>
          <p>We use your information to operate, maintain, and improve the Stampworth system, provide customer support, facilitate communication between users and partner businesses, and deliver features such as nearby store alerts and reward notifications.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">3. Location Data</h2>
          <p>Stampworth collects location data to provide geofencing, nearby store alerts, and the store map feature. <strong>Your location is only shared with the system when you are within the geofence radius (up to 2km) of a Stampworth partner store.</strong> When you are outside all geofence zones, your location is not collected, stored, or shared. Businesses can only see customers who are within their store's geofence radius.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">4. Data Sharing</h2>
          <p>Your data may be shared with authorized partner merchants only when necessary to process rewards and ensure proper system functionality. We do not sell your personal data to third parties. Merchant businesses can see your name and stamp activity only for their own loyalty card.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">5. Data Security</h2>
          <p>We implement reasonable security measures to protect your information, including encrypted connections (HTTPS), secure authentication via Supabase, and row-level security on the database. However, no system can guarantee complete security.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">6. Offline Data</h2>
          <p>The app caches certain data locally on your device (such as your QR code and loyalty card information) to enable offline access. This cached data is stored securely on your device and is cleared when you sign out.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">7. Notifications</h2>
          <p>Stampworth may send you notifications about nearby stores, stamp activity, reward availability, and announcements from stores you follow. You can manage notification preferences in your device settings. Notification read states are stored locally on your device.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">8. Your Rights</h2>
          <p>You have the right to access, update, or request deletion of your personal data. You can update your profile information through the Account page. To delete your account and all associated data, use the "Delete Account" option in the app, or contact the admin team.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">9. Children's Privacy</h2>
          <p>Stampworth is not intended for children under the age of 13. We do not knowingly collect personal information from children.</p>

          <h2 className="text-lg font-bold text-[#1A1A2E]">10. Changes to This Policy</h2>
          <p>By continuing to use the Stampworth Loyalty Card system, you consent to the collection, use, and processing of your information in accordance with this Privacy Policy and any future updates. We will notify users of significant changes through the app.</p>
        </div>
      </main>
      <footer className="border-t border-zinc-200 py-8 px-6 bg-zinc-50">
        <div className="max-w-3xl mx-auto text-center text-xs text-[#C4CAD4]">© 2026 Stampworth. All rights reserved.</div>
      </footer>
    </>
  );
}
