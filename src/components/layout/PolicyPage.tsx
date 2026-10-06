import { siteConfig } from "@/lib/site-config";

export function PolicyPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1">
      <h1 className="font-heading text-4xl sm:text-5xl font-normal text-center mb-4">{title}</h1>
      <p className="text-center text-sm text-muted-foreground mb-12">
        Last updated: {siteConfig.policiesLastUpdated}
      </p>
      <div className="space-y-8 text-[15px] leading-relaxed text-foreground/80 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:text-foreground [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </div>
  );
}

export function ContactBlock() {
  return (
    <ul>
      <li>Email: <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a></li>
      <li>Phone: <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}>{siteConfig.supportPhone}</a></li>
      <li>Business: {siteConfig.legalName}</li>
      {siteConfig.registeredAddress && <li>Registered address: {siteConfig.registeredAddress}</li>}
      {siteConfig.operationalAddress && <li>Operational address: {siteConfig.operationalAddress}</li>}
    </ul>
  );
}
