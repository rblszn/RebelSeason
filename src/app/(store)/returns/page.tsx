import { ContactBlock, PolicyPage } from "@/components/layout/PolicyPage";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Cancellation & Refund Policy" };

export default function CancellationRefundPolicyPage() {
  const c = siteConfig;
  return (
    <PolicyPage title="Cancellation & Refund Policy">
      <section>
        <p>
          Please read this policy carefully before placing an order. By completing a purchase on this website, you agree
          to the terms below.
        </p>
      </section>

      <section>
        <h2>No cancellations after confirmation</h2>
        <ul>
          <li>An order is confirmed as soon as your payment is successful and you receive an order confirmation.</li>
          <li>Once an order is confirmed, it cannot be cancelled or modified (including changes to size, quantity or delivery address).</li>
          <li>Please check your size, product details and shipping address carefully before making payment.</li>
        </ul>
      </section>

      <section>
        <h2>No returns, exchanges or refunds</h2>
        <ul>
          <li>All sales are final. We do not offer returns, exchanges or refunds on confirmed or delivered orders.</li>
          <li>This includes change of mind, incorrect size selection, or the product not matching personal preferences.</li>
          <li>Slight variations in colour between the product photos and the actual product may occur due to lighting and screen settings, and are not considered defects.</li>
        </ul>
      </section>

      <section>
        <h2>Exceptions: damaged, defective or wrong items</h2>
        <p>We stand behind the quality of what we ship. If your order arrives:</p>
        <ul>
          <li>damaged or defective, or</li>
          <li>with the wrong product or wrong size compared to your order,</li>
        </ul>
        <p>
          please contact us within {c.damageReportHours} hours of delivery with your order number, clear photos of the
          product and packaging, and an unboxing video if available. After verification, we will send a replacement. If a
          replacement is not available, we will issue a full refund for the affected item.
        </p>
        <p>Items must be unused, unwashed and returned with original tags and packaging for the claim to be accepted.</p>
      </section>

      <section>
        <h2>Orders we cannot fulfil</h2>
        <p>
          In the rare case that we are unable to ship your order (for example, if an item goes out of stock after payment),
          we will cancel the order and issue a full refund, including any shipping charges.
        </p>
      </section>

      <section>
        <h2>Failed or duplicate payments</h2>
        <p>
          If money was debited from your account but your order was not confirmed, or you were charged more than once for
          the same order, the extra amount is refunded automatically to your original payment method.
        </p>
      </section>

      <section>
        <h2>Refund method and timeline</h2>
        <p>
          Approved refunds are issued to the original payment method used at checkout and usually reflect in your account
          within {c.refundProcessingDays}, depending on your bank or payment provider.
        </p>
      </section>

      <section>
        <h2>Contact us</h2>
        <ContactBlock />
      </section>
    </PolicyPage>
  );
}
