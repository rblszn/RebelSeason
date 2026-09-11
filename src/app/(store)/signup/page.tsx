"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // OTP State
  const [step, setStep] = useState<"details" | "otp">("details");
  const [otp, setOtp] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, action: "signup" }),
      });

      const data = await res.json();

      if (res.ok && data.requiresOtp) {
        setStep("otp");
      } else {
        setError(data.error || "Signup failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(data.redirectTo || "/account");
        router.refresh();
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4 bg-secondary/30">
      <div className="w-full max-w-md bg-background p-8 rounded-2xl shadow-sm border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading mb-2">Create Account</h1>
          {step === "details" ? (
            <p className="text-muted-foreground text-sm">Join The Rebel Season community</p>
          ) : (
            <p className="text-muted-foreground text-sm">Enter the code sent to {formData.email}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {step === "details" ? (
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border border-border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 border border-border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 border border-border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2.5 border border-border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1 text-center">6-Digit Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-3 text-center tracking-[0.5em] text-xl border border-border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="123456"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify Account"}
            </Button>
            
            <button 
              type="button"
              onClick={() => setStep("details")}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              Back to Sign Up
            </button>
          </form>
        )}

        {step === "details" && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground font-medium hover:underline">
              Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
