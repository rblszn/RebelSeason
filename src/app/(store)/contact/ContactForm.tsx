"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="p-6 border border-green-200 bg-green-50 text-green-800 text-sm text-center">
        Thank you! Your message has been sent. We&apos;ll get back to you soon.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-[13px] font-medium text-foreground mb-2">Name</label>
          <Input id="name" name="name" type="text" required maxLength={100} placeholder="Name" className="w-full h-12 rounded-md border-border bg-background" />
        </div>
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-2">Email</label>
          <Input id="email" name="email" type="email" required placeholder="Email" className="w-full h-12 rounded-md border-border bg-background" />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-[13px] font-medium text-foreground mb-2">Phone</label>
        <Input id="phone" name="phone" type="tel" maxLength={20} placeholder="Phone" className="w-full h-12 rounded-md border-border bg-background" />
      </div>

      <div>
        <label htmlFor="message" className="block text-[13px] font-medium text-foreground mb-2">Message</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={5}
          maxLength={5000}
          placeholder="How can we help? Include your order number if your message is about an order."
          rows={6}
          className="flex w-full rounded-md border border-border bg-background px-3 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-y"
        />
      </div>

      {/* Honeypot field for bots; hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {status === "error" && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-foreground text-background hover:bg-foreground/85 text-[13px] font-medium px-8 h-12 tracking-wide"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
