import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve('apps/server/.env') });

import { parseArgs } from 'node:util';

import { render } from '@citydenapartments/email';
import { BookingReceiptEmail } from '@citydenapartments/email';
import { AccountCreatedEmail } from '@citydenapartments/email';

const {
  values: { to, template: tmpl, provider, help },
} = parseArgs({
  options: {
    to: { type: 'string', short: 't', default: '' },
    template: { type: 'string', short: 'm', default: 'receipt' },
    provider: { type: 'string', short: 'p', default: 'zeptomail' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (help || !to) {
  console.log(`
Usage: pnpm tsx scripts/test-email.ts --to recipient@example.com [options]

Options:
  --to, -t        Recipient email address (required)
  --template, -m  Template to send: receipt | account (default: receipt)
  --provider, -p  Provider: zeptomail | resend (default: zeptomail)
  --help, -h      Show this help
`);
  process.exit(0);
}

const fromName = process.env.EMAIL_FROM_NAME || 'City Den Apartments';
const fromEmail = process.env.EMAIL_FROM_EMAIL || 'noreply@citydenapartments.com';
const zeptoToken = process.env.ZEPTOMAIL_API_TOKEN;
const resendKey = process.env.RESEND_API_KEY;

const templates: Record<string, { build: () => React.ReactElement; subject: string }> = {
  receipt: {
    subject: 'Test: Booking Receipt — CDA-TEST-001',
    build: () =>
      BookingReceiptEmail({
        guestName: 'John Doe',
        guestEmail: to,
        guestPhone: '+2348012345678',
        bookingReference: 'CDA-TEST-001',
        branchName: 'Lekki Branch',
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-05',
        rooms: [
          { roomNumber: '101', roomType: 'Deluxe King', nights: 4, pricePerNight: 45000, total: 180000 },
          { roomNumber: '102', roomType: 'Standard Twin', nights: 4, pricePerNight: 35000, total: 140000 },
        ],
        numberOfGuests: 3,
        subtotal: 320000,
        discount: 16000,
        discountPercentage: 5,
        vatAmount: 22800,
        serviceChargeAmount: 30400,
        totalPaid: 357200,
        paymentMethod: 'pos_card',
        paymentReference: 'POS-REF-12345',
        bookingStatus: 'confirmed',
        bookingDate: '2026-07-28',
      }),
  },
  account: {
    subject: 'Test: Account Created',
    build: () =>
      AccountCreatedEmail({
        name: 'Jane Staff',
        email: to,
        password: 'TempPass123!',
        role: 'Receptionist',
        loginUrl: 'https://console.citydenapartments.com/login',
        createdBy: 'Admin User',
      }),
  },
};

async function main() {
  const cfg = templates[tmpl];
  if (!cfg) {
    console.error(`Unknown template "${tmpl}". Use: receipt | account`);
    process.exit(1);
  }

  console.log(`Rendering template: ${tmpl}`);
  const html = await render(cfg.build(), { pretty: true });
  console.log(`HTML size: ${(html.length / 1024).toFixed(1)} KB\n`);

  let sent = false;

  if (provider === 'zeptomail' && zeptoToken) {
    sent = await sendZeptomail(to, cfg.subject, html);
  } else if (provider === 'resend' && resendKey) {
    sent = await sendResend(to, cfg.subject, html);
  } else {
    console.log('No provider configured or matching API key not found.');
    console.log(`Rendered HTML would be sent to: ${to}`);

    const outDir = import.meta.url ? new URL('.', import.meta.url).pathname : process.cwd();
    const fs = await import('node:fs');
    const path = await import('node:path');
    const htmlPath = path.join(outDir, `test-${tmpl}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`Saved to: ${htmlPath}`);
  }

  if (sent) {
    console.log(`\n✓ Email sent successfully to ${to} via ${provider}`);
  }
}

async function sendZeptomail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`Sending via Zeptomail...`);
  const authHeader = zeptoToken!.startsWith('Zoho-enczapikey ') ? zeptoToken! : `Zoho-enczapikey ${zeptoToken!}`;
  const res = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: fromName },
      to: [{ email_address: { address: to } }],
      subject,
      htmlbody: html,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Zeptomail error (${res.status}): ${body.slice(0, 500)}`);
    return false;
  }
  console.log(`Zeptomail response: ${body.slice(0, 200)}`);
  return true;
}

async function sendResend(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`Sending via Resend...`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey!}`,
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Resend error (${res.status}): ${body.slice(0, 500)}`);
    return false;
  }
  console.log(`Resend response: ${body.slice(0, 200)}`);
  return true;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
