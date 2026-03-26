"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simple admin check — in production, use Supabase auth with admin role
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@stampworth.com";
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

    if (email === adminEmail && password === adminPass) {
      localStorage.setItem("stampworth_admin", "true");
      router.push("/dashboard");
    } else {
      setError("Invalid admin credentials");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Stampworth" className="w-12 h-12 mb-4" />
            <h1 className="text-2xl font-bold text-[#2F4366]">Stampworth</h1>
            <p className="text-gray-400 text-sm mt-1">Admin Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-[#2F4366] focus:ring-1 focus:ring-[#2F4366]"
                placeholder="admin@stampworth.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-[#2F4366] focus:ring-1 focus:ring-[#2F4366]"
                placeholder="Enter password"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#2F4366] text-white rounded-xl font-semibold text-sm hover:bg-[#243550] transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
