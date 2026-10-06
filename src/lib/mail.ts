import nodemailer from 'nodemailer';
import { siteConfig } from '@/lib/site-config';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const FROM_ADDRESS = process.env.EMAIL_USER || 'noreply@rebelseason.com';

// Customer-supplied values (names, addresses) must be escaped before going into HTML.
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? esc(url) : '#';
}

function wrapHtml(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #FDF0F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDF0F4; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <tr><td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
          <h1 style="margin: 0; font-size: 24px; color: #111111; font-weight: 800; letter-spacing: -0.5px;">THE REBEL SEASON</h1>
        </td></tr>
        <tr><td style="padding: 40px 30px; background-color: #ffffff;">${content}</td></tr>
        <tr><td align="center" style="padding: 20px 30px 30px; background-color: #ffffff; color: #888888; font-size: 12px;">
          <p style="margin: 0 0 10px;">If you have any questions, reply to this email or contact our support team.</p>
          <p style="margin: 0;">&copy; ${year} The Rebel Season. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const html = wrapHtml(`
    <h2 style="margin: 0 0 20px; font-size: 20px; color: #111111; text-align: center;">Your Verification Code</h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #444444; line-height: 1.5; text-align: center;">
      Please use the following code to verify your account or complete your login.
    </p>
    <div style="background-color: #FDF0F4; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #db2777;">${otp}</span>
    </div>
    <p style="margin: 0; font-size: 14px; color: #666666; text-align: center;">
      This code expires in 10 minutes. If you did not request this, please ignore this email.
    </p>
  `);

  const mailOptions = {
    from: `"The Rebel Season" <${FROM_ADDRESS}>`,
    replyTo: siteConfig.supportEmail,
    to,
    subject: "Your Verification Code - The Rebel Season",
    html,
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.log("\n=========================================");
      console.log("[MOCK EMAIL] OTP for " + to + " is: " + (process.env.NODE_ENV === "production" ? "<hidden>" : otp));
      console.log("=========================================\n");
      return true;
    }
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
}

export async function sendOrderConfirmationEmail(to: string, order: any): Promise<boolean> {
  const address = typeof order.shippingAddress === 'string'
    ? JSON.parse(order.shippingAddress)
    : order.shippingAddress;

  const itemsHtml = order.items.map((item: any) => {
    const sizeRow = item.variantName
      ? '<p style="margin: 4px 0 0; font-size: 13px; color: #666666;">Size: ' + esc(item.variantName) + '</p>'
      : '';
    return '<tr>'
      + '<td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">'
      + '<p style="margin: 0; font-weight: 600; color: #111111;">' + esc(item.name) + '</p>'
      + sizeRow
      + '</td>'
      + '<td align="center" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #444444;">' + esc(item.quantity) + '</td>'
      + '<td align="right" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 500; color: #111111;">\u20B9' + (item.price * item.quantity) + '</td>'
      + '</tr>';
  }).join('');

  const paymentRefHtml = order.payment?.razorpayPaymentId
    ? '<p style="margin: 0; font-size: 14px; color: #666666;">Payment Ref: <strong style="color: #111111;">' + esc(order.payment.razorpayPaymentId) + '</strong></p>'
    : '';

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rebelseason.vercel.app';

  const html = wrapHtml(`
    <h2 style="margin: 0 0 16px; font-size: 24px; color: #111111; text-align: center;">Order Confirmed! \ud83c\udf89</h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #444444; line-height: 1.5; text-align: center;">
      Thank you for your purchase, ${esc(order.customerName)}! We've received your order and it is now being processed.
    </p>

    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #666666;">Order Number: <strong style="color: #111111;">${esc(order.orderNumber)}</strong></p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #666666;">Date: <strong style="color: #111111;">${orderDate}</strong></p>
      ${paymentRefHtml}
    </div>

    <h3 style="margin: 0 0 16px; font-size: 18px; color: #111111; border-bottom: 2px solid #111111; padding-bottom: 8px;">Order Details</h3>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <thead>
        <tr>
          <th align="left" style="padding-bottom: 12px; border-bottom: 1px solid #dddddd; font-size: 14px; color: #666666; font-weight: 600;">Item</th>
          <th align="center" style="padding-bottom: 12px; border-bottom: 1px solid #dddddd; font-size: 14px; color: #666666; font-weight: 600;">Qty</th>
          <th align="right" style="padding-bottom: 12px; border-bottom: 1px solid #dddddd; font-size: 14px; color: #666666; font-weight: 600;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" align="right" style="padding: 16px 0 8px; font-size: 14px; color: #666666;">Subtotal:</td>
          <td align="right" style="padding: 16px 0 8px; font-weight: 500; color: #111111;">\u20B9${order.subtotal}</td>
        </tr>
        <tr>
          <td colspan="2" align="right" style="padding: 8px 0; font-size: 14px; color: #666666;">Shipping:</td>
          <td align="right" style="padding: 8px 0; font-weight: 500; color: #111111;">${order.shipping === 0 ? 'Free' : '\u20B9' + order.shipping}</td>
        </tr>
        ${order.discount > 0 ? '<tr><td colspan="2" align="right" style="padding: 8px 0; font-size: 14px; color: #16a34a;">Discount ' + (order.couponCode ? '(' + esc(order.couponCode) + ')' : '') + ':</td><td align="right" style="padding: 8px 0; font-weight: 500; color: #16a34a;">-₹' + order.discount + '</td></tr>' : ''}
        <tr>
          <td colspan="2" align="right" style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #111111; border-top: 2px solid #111111;">Total:</td>
          <td align="right" style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #111111; border-top: 2px solid #111111;">\u20B9${order.total}</td>
        </tr>
      </tfoot>
    </table>

    <h3 style="margin: 0 0 16px; font-size: 18px; color: #111111; border-bottom: 2px solid #111111; padding-bottom: 8px;">Shipping Address</h3>
    <p style="margin: 0 0 4px; font-size: 15px; color: #111111; font-weight: 500;">${esc(address.name)}</p>
    <p style="margin: 0 0 4px; font-size: 14px; color: #444444;">${esc(address.street)}</p>
    <p style="margin: 0 0 4px; font-size: 14px; color: #444444;">${esc(address.city)}, ${esc(address.state)} ${esc(address.pincode)}</p>
    <p style="margin: 0 0 24px; font-size: 14px; color: #444444;">Phone: ${esc(address.phone)}</p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${appUrl}/account" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">View Your Orders</a>
    </div>
  `);

  const mailOptions = {
    from: `"The Rebel Season" <${FROM_ADDRESS}>`,
    replyTo: siteConfig.supportEmail,
    to,
    subject: "Order Confirmed - #" + order.orderNumber,
    html,
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.log("\n=========================================");
      console.log("[MOCK EMAIL] Order Confirmation for " + to + ", Order: #" + order.orderNumber);
      console.log("=========================================\n");
      return true;
    }
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return false;
  }
}

export async function sendShippingNotificationEmail(to: string, order: any, trackingUrl: string): Promise<boolean> {
  const address = typeof order.shippingAddress === 'string'
    ? JSON.parse(order.shippingAddress)
    : order.shippingAddress;

  const html = wrapHtml(`
    <h2 style="margin: 0 0 16px; font-size: 24px; color: #111111; text-align: center;">Your Order is On Its Way! \ud83d\udce6</h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #444444; line-height: 1.5; text-align: center;">
      Great news! Your order <strong style="color: #111111;">#${esc(order.orderNumber)}</strong> has been shipped and is on its way to you.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${safeUrl(trackingUrl)}" style="display: inline-block; background-color: #db2777; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(219, 39, 119, 0.25);">Track Your Order</a>
    </div>

    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px; color: #111111;">Shipping To:</h3>
      <p style="margin: 0 0 4px; font-size: 14px; color: #111111; font-weight: 500;">${esc(address.name)}</p>
      <p style="margin: 0 0 4px; font-size: 14px; color: #444444;">${esc(address.street)}</p>
      <p style="margin: 0; font-size: 14px; color: #444444;">${esc(address.city)}, ${esc(address.state)} ${esc(address.pincode)}</p>
    </div>
  `);

  const mailOptions = {
    from: `"The Rebel Season" <${FROM_ADDRESS}>`,
    replyTo: siteConfig.supportEmail,
    to,
    subject: "Your Order #" + order.orderNumber + " Has Shipped!",
    html,
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.log("\n=========================================");
      console.log("[MOCK EMAIL] Shipping Notification for " + to + ", Tracking: " + trackingUrl);
      console.log("=========================================\n");
      return true;
    }
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending shipping notification email:", error);
    return false;
  }
}

export async function sendContactMessageEmail(msg: { name: string; email: string; phone?: string; message: string }): Promise<boolean> {
  const html = wrapHtml(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #111111;">New contact form message</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #444444;"><strong>Name:</strong> ${esc(msg.name)}</p>
    <p style="margin: 0 0 8px; font-size: 14px; color: #444444;"><strong>Email:</strong> ${esc(msg.email)}</p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #444444;"><strong>Phone:</strong> ${esc(msg.phone || "-")}</p>
    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 16px; font-size: 14px; color: #111111; white-space: pre-wrap;">${esc(msg.message)}</div>
  `);

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.log("[MOCK EMAIL] Contact message from " + msg.email);
      return true;
    }
    await transporter.sendMail({
      from: `"The Rebel Season Website" <${FROM_ADDRESS}>`,
      to: siteConfig.supportEmail,
      replyTo: msg.email,
      subject: "Contact form: " + msg.name.slice(0, 80),
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending contact message email:", error);
    return false;
  }
}
