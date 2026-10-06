import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactMessageEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional().default(""),
  message: z.string().trim().min(5).max(5000),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional().default(""),
});

export async function POST(request: Request) {
  if (!(await checkRateLimit(getClientIp(request), "contact", 3, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many messages. Please try again later or email us directly." }, { status: 429 });
  }

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in your name, a valid email and a message." }, { status: 400 });
  }

  const sent = await sendContactMessageEmail(parsed.data);
  if (!sent) {
    return NextResponse.json({ error: "We couldn't send your message. Please email us directly." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
