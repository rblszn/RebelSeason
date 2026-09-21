"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to login");
      }
      
      router.push("/account");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 px-4">
      <div className="w-full max-w-md">
        <h1 className="font-heading text-4xl font-normal text-center mb-8">Log In</h1>
        
        <form className="space-y-5" onSubmit={handleLogin}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-2">Email Address</label>
            <Input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-transparent rounded-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[12px] font-medium text-foreground">Password</label>
              <Link href="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground">Forgot password?</Link>
            </div>
            <Input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-transparent rounded-sm" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium tracking-wide">
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-8 text-center text-[13px] text-muted-foreground">
          Don&apos;t have an account? <Link href="/signup" className="text-foreground underline underline-offset-4 font-medium hover:text-muted-foreground">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
