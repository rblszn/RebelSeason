"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      alert("Password reset successfully. You can now log in.");
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="font-heading text-4xl text-center mb-2">Reset Password</h1>
        
        {step === "email" ? (
          <>
            <p className="text-center text-muted-foreground mb-8 text-sm">
              Enter your email address and we will send you a code to reset your password.
            </p>
            <form onSubmit={handleSendOtp} className="space-y-4">
              {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2">{error}</div>}
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-none bg-secondary/50 border-border"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-none uppercase tracking-widest text-xs font-semibold bg-foreground text-background">
                {isLoading ? "Sending..." : "Send Reset Code"}
              </Button>
              <div className="text-center mt-6">
                <Link href="/login" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
                  Back to Login
                </Link>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="text-center text-muted-foreground mb-8 text-sm">
              Enter the 6-digit code sent to your email and your new password.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2">{error}</div>}
              <div>
                <Input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="h-12 rounded-none bg-secondary/50 border-border text-center tracking-widest text-lg"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 rounded-none bg-secondary/50 border-border"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-none uppercase tracking-widest text-xs font-semibold bg-foreground text-background mt-4">
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
