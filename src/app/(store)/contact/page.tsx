import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  const c = siteConfig;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1">
      <h1 className="font-heading text-4xl sm:text-5xl font-normal text-center mb-4">Contact us</h1>
      <p className="text-center text-muted-foreground mb-12">
        Questions about an order, sizing or returns? We&apos;re happy to help.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12">
        <div className="space-y-6 text-[14px]">
          <div className="flex gap-3">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Email</p>
              <a href={`mailto:${c.supportEmail}`} className="text-muted-foreground underline underline-offset-4">{c.supportEmail}</a>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Phone</p>
              <a href={`tel:${c.supportPhone.replace(/\s/g, "")}`} className="text-muted-foreground">{c.supportPhone}</a>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{c.registeredBusinessName}</p>
              <p className="text-muted-foreground">Proprietor: {c.proprietorName}</p>
              {c.registeredAddress && (
                <p className="text-muted-foreground mt-2">
                  <span className="text-foreground">Registered address:</span> {c.registeredAddress}
                </p>
              )}
              {c.operationalAddress && (
                <p className="text-muted-foreground mt-2">
                  <span className="text-foreground">Operational address:</span> {c.operationalAddress}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Support hours</p>
              <p className="text-muted-foreground">{c.supportHours}</p>
            </div>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
