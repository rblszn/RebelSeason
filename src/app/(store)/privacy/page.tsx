import { ContactBlock, PolicyPage } from "@/components/layout/PolicyPage";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  const c = siteConfig;
  return (
    <PolicyPage title="Privacy Policy">
      <section>
        <p>
          {c.legalName} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy. This policy explains what
          personal information we collect when you use this website or buy from us, how we use it, and the choices you
          have. By using this website, you agree to this policy.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name, email address, phone number and password. Passwords are stored only in encrypted (hashed) form.</li>
          <li><strong>Order details:</strong> shipping addresses, products purchased, order history and communication related to your orders.</li>
          <li><strong>Payment details:</strong> payments are handled by our payment partner, Razorpay. Your card, UPI or bank details are entered directly with Razorpay; we never see or store them. We only receive a payment reference and status.</li>
          <li><strong>Technical information:</strong> such as your IP address and browser type, used to keep the website secure and prevent fraud.</li>
          <li><strong>Messages you send us</strong> through the contact form or email.</li>
        </ul>
      </section>

      <section>
        <h2>How we use your information</h2>
        <ul>
          <li>To process, ship and deliver your orders.</li>
          <li>To send order confirmations, shipping updates and verification codes (OTP).</li>
          <li>To manage your account and saved addresses.</li>
          <li>To respond to your questions and support requests.</li>
          <li>To detect and prevent fraud, abuse and security issues.</li>
          <li>To comply with legal, tax and accounting obligations.</li>
        </ul>
      </section>

      <section>
        <h2>Sharing your information</h2>
        <p>We do not sell or rent your personal information. We share it only as needed to run our store:</p>
        <ul>
          <li>with Razorpay, to process payments;</li>
          <li>with courier and logistics partners, to deliver your orders;</li>
          <li>with service providers that host our website, store images and send emails on our behalf;</li>
          <li>with government or law enforcement authorities, when required by law.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use essential cookies to keep you signed in and to remember the items in your cart. We do not use advertising
          or third-party tracking cookies. You can clear cookies in your browser at any time, but you will be signed out.
        </p>
      </section>

      <section>
        <h2>Data security</h2>
        <p>
          We use reasonable security measures, including encrypted connections (HTTPS) and hashed passwords, to protect your
          information. However, no method of transmission or storage over the internet is completely secure.
        </p>
      </section>

      <section>
        <h2>Data retention</h2>
        <p>
          We keep your account information while your account is active. Order and payment records are kept for as long
          as required for tax, accounting and legal purposes.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can view and update your name, phone number and saved addresses from your account at any time. To request a
          copy of your data, correct it, or delete your account, contact us using the details below.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          This website is not intended for children under 18. We do not knowingly collect personal information from
          children without parental consent.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with a new date.</p>
      </section>

      <section>
        <h2>Contact and grievances</h2>
        <p>For privacy questions or complaints, contact us at:</p>
        <ContactBlock />
      </section>
    </PolicyPage>
  );
}
