import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy — QR Menu", description: "How QR Menu collects, uses and protects information." };

const mail = <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-brand hover:underline">{OPERATOR.email}</a>;

const sections: LegalSection[] = [
  { title: "What we collect", body: <>
    <p><strong>Account information.</strong> Your email address and password. Passwords are stored securely by our authentication provider, and we cannot read them. We also record when you signed up, signed in, and accepted our Terms.</p>
    <p><strong>Restaurant and menu information.</strong> Everything you add to your restaurant profile and menu, including images. This information is <strong>public by design</strong>.</p>
    <p><strong>Usage information.</strong> Changes made in the editor (an activity log), daily totals of QR code scans for each menu, and technical logs such as IP address, browser type and error reports, which we use for security and reliability.</p>
  </> },
  { title: "Guests who view a menu", body: <p>Guests do not need an account to view a menu. We do not set advertising or tracking cookies on public menus. We count QR scans as daily totals for each restaurant and do not build profiles of individual guests. Our hosting providers may briefly process technical data, such as IP addresses, to deliver pages and prevent abuse.</p> },
  { title: "How we use information", body: <ul>
    <li>To provide, secure and support QR Menu, and to send account and service messages.</li>
    <li>To understand usage and improve QR Menu, RestroFuel and our other products.</li>
    <li>To create aggregated or de-identified statistics and insights, for example menu pricing trends, which may be shared or published without identifying you personally.</li>
    <li>To showcase public menus as examples. You can opt out by emailing us.</li>
    <li>To tell you about RestroFuel and related offers. You can unsubscribe at any time.</li>
    <li>To prevent fraud and abuse, enforce our <Link href="/terms" className="font-semibold text-brand hover:underline">Terms</Link>, and meet legal obligations.</li>
  </ul> },
  { title: "Who we share it with", body: <>
    <p>We do not sell your personal information. We share it only with:</p>
    <ul>
      <li><strong>Service providers</strong> who run parts of the service for us: database and authentication hosting (Supabase), image storage and delivery (Cloudinary), and web hosting. They may process data outside Nepal under their own security commitments.</li>
      <li><strong>Authorities</strong>, when required by law or to protect the rights, safety or property of our users, the public or us.</li>
      <li><strong>A successor</strong>, if our business or this service is reorganised, merged or sold.</li>
    </ul>
    <p>Restaurant and menu information is public and may be seen, copied or indexed by anyone.</p>
  </> },
  { title: "How long we keep it", body: <p>We keep account and restaurant information while your account is active. When you ask us to delete your account, we delete or de-identify your personal information within a reasonable time. We may keep limited records, backups and aggregated data where needed for security, legal or legitimate business purposes.</p> },
  { title: "Security", body: <p>We use access controls, encryption in transit, and per-restaurant isolation in our database to protect information. No online service is perfectly secure, so please use a strong, unique password.</p> },
  { title: "Your choices and rights", body: <ul>
    <li>Edit your restaurant and menu information in your dashboard at any time.</li>
    <li>Ask us for a copy of your account information, or ask us to correct or delete it.</li>
    <li>Opt out of promotional emails or showcase use.</li>
  </ul> },
  { title: "Children", body: <p>QR Menu is for businesses and is not directed at children under 18. We do not knowingly collect their personal information.</p> },
  { title: "Changes to this policy", body: <p>We may update this policy. We will change the “Last updated” date and notify account holders of material changes by email or in the app.</p> },
  { title: "Contact", body: <p>For privacy questions or requests, contact {OPERATOR.name}, {OPERATOR.location}, at {mail}.</p> },
];

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" sections={sections}
    intro={<p>QR Menu holds very little personal information. Most of what you add, your restaurant details and menu, is meant to be public. This policy explains what we collect, how we use it, and the choices you have.</p>} />;
}
