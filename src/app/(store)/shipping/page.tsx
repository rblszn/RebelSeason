import Link from "next/link";
import { ContactBlock, PolicyPage } from "@/components/layout/PolicyPage";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Shipping & Delivery Policy" };

export default function ShippingPolicyPage() {
  const c = siteConfig;
  return (
    <PolicyPage title="Shipping & Delivery Policy">
      <section>
        <h2>Where we ship</h2>
        <p>We currently ship to addresses within India only.</p>
      </section>

      <section>
        <h2>Delivery time</h2>
        <ul>
          <li>Orders are usually delivered within <strong>{c.deliveryDays}</strong> of order confirmation.</li>
          <li>Delivery times are estimates. Remote locations, courier delays, weather, public holidays or other events outside our control may cause delays. We will keep you informed if your order is delayed.</li>
        </ul>
      </section>

      <section>
        <h2>Shipping charges</h2>
        <ul>
          <li>Free shipping on orders above ₹{c.freeShippingThreshold.toLocaleString("en-IN")}.</li>
          <li>A flat fee of ₹{c.shippingFee} applies to orders of ₹{c.freeShippingThreshold.toLocaleString("en-IN")} or less.</li>
          <li>The shipping charge for your order is shown at checkout before you pay.</li>
        </ul>
      </section>

      <section>
        <h2>Order tracking</h2>
        <p>
          Once your order is shipped, we will email you a tracking link. You can also view the status of your orders under
          <strong> My Account → Orders</strong>.
        </p>
      </section>

      <section>
        <h2>Shipping address</h2>
        <ul>
          <li>Please make sure your shipping address, PIN code and phone number are complete and correct. Orders cannot be modified once confirmed.</li>
          <li>We are not responsible for delays or non-delivery caused by an incorrect or incomplete address provided at checkout.</li>
          <li>If a parcel is returned to us because the address was incorrect or the recipient was unavailable, we will contact you to arrange re-delivery. Additional shipping charges may apply.</li>
        </ul>
      </section>

      <section>
        <h2>Damaged parcels</h2>
        <p>
          If your parcel arrives visibly damaged or tampered with, please take photos and contact us within{" "}
          {c.damageReportHours} hours of delivery. See our <Link href="/returns">Cancellation &amp; Refund Policy</Link> for
          details.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>Contact us for any shipping or delivery questions:</p>
        <ContactBlock />
      </section>
    </PolicyPage>
  );
}
