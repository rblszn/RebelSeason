import Link from "next/link";
import { ContactBlock, PolicyPage } from "@/components/layout/PolicyPage";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  const c = siteConfig;
  return (
    <PolicyPage title="Terms & Conditions">
      <section>
        <p>
          This website is owned and operated by {c.legalName} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By
          accessing this website or placing an order, you agree to these Terms &amp; Conditions together with our{" "}
          <Link href="/privacy">Privacy Policy</Link>, <Link href="/shipping">Shipping &amp; Delivery Policy</Link> and{" "}
          <Link href="/returns">Cancellation &amp; Refund Policy</Link>. If you do not agree, please do not use this website.
        </p>
      </section>

      <section>
        <h2>Eligibility and accounts</h2>
        <ul>
          <li>You must be at least 18 years old, or use the website under the supervision of a parent or guardian.</li>
          <li>You agree to provide accurate and complete information, including your name, email, phone number and shipping address.</li>
          <li>You are responsible for keeping your account credentials confidential and for all activity under your account.</li>
        </ul>
      </section>

      <section>
        <h2>Products and pricing</h2>
        <ul>
          <li>All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.</li>
          <li>We make every effort to display products, colours and sizes accurately. Actual colours may vary slightly depending on your screen and lighting.</li>
          <li>Prices, offers and product availability may change without notice. The price charged is the one shown at checkout when you pay.</li>
          <li>Coupons are subject to their stated conditions, cannot be exchanged for cash and may be withdrawn at any time.</li>
        </ul>
      </section>

      <section>
        <h2>Orders and payment</h2>
        <ul>
          <li>Payments are processed securely by our payment partner, Razorpay. We do not store your card, UPI or bank details.</li>
          <li>An order is confirmed only after payment is successfully received. You will receive an order confirmation by email.</li>
          <li>We reserve the right to refuse or cancel any order in case of a pricing or listing error, stock unavailability, or suspected fraud. In such cases, any amount paid will be refunded in full.</li>
        </ul>
      </section>

      <section>
        <h2>Cancellations, returns and refunds</h2>
        <p>
          Confirmed orders cannot be cancelled, and we do not offer returns, exchanges or refunds, except for damaged,
          defective or incorrect items reported within {c.damageReportHours} hours of delivery. Full details are in our{" "}
          <Link href="/returns">Cancellation &amp; Refund Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Shipping and delivery</h2>
        <p>
          Orders are usually delivered within {c.deliveryDays} of confirmation. Delivery dates are estimates and are not
          guaranteed. See our <Link href="/shipping">Shipping &amp; Delivery Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          All content on this website, including designs, product images, logos, text and graphics, is the property of{" "}
          {c.brandName} and may not be copied, reproduced or used without our written permission.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          You agree not to misuse this website, including attempting to gain unauthorised access, interfering with its
          operation, or using it for any unlawful or fraudulent purpose.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for any indirect or consequential loss arising from the
          use of this website or our products. Our total liability for any order is limited to the amount paid for that order.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          We may update these Terms &amp; Conditions from time to time. Changes take effect when posted on this page, and the
          terms in effect at the time of your order apply to that order.
        </p>
      </section>

      <section>
        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of {c.jurisdiction}. Any disputes are subject to the exclusive jurisdiction
          of the courts at {c.courtsCity}.
        </p>
      </section>

      <section>
        <h2>Contact us</h2>
        <ContactBlock />
      </section>
    </PolicyPage>
  );
}
