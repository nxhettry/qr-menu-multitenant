import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { RESTROFUEL_URL } from "@/components/ui/brand";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service — QR Menu", description: "The terms for using QR Menu, a free digital menu service by RestroFuel." };

const mail = <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-brand hover:underline">{OPERATOR.email}</a>;

const sections: LegalSection[] = [
  { title: "Who we are", body: <p>QR Menu is operated by <strong>{OPERATOR.name}</strong>, {OPERATOR.location} (“we”, “us”). QR Menu is offered free of charge as part of <a href={RESTROFUEL_URL} target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">RestroFuel</a>, our restaurant management system. By creating an account or using the service, you agree to these Terms and to our <Link href="/privacy" className="font-semibold text-brand hover:underline">Privacy Policy</Link>.</p> },
  { title: "Your account", body: <ul>
    <li>You must be at least 18 years old and authorised to act for the restaurant you list.</li>
    <li>Give us accurate information and keep your email address current so we can reach you.</li>
    <li>Keep your password private. You are responsible for activity under your account.</li>
    <li>Tell us promptly at {mail} if you think your account has been misused.</li>
  </ul> },
  { title: "The free service", body: <>
    <p>QR Menu is free. We provide it “as is” and “as available”. We may add, change, limit or discontinue features at any time, including introducing optional paid features. We will give reasonable notice of material changes where we can.</p>
    <p>We do not guarantee uninterrupted availability. Keep your own copy of important menu information.</p>
  </> },
  { title: "Your content is public", body: <>
    <p>Your restaurant details (such as name, address, phone, opening hours and branding) and your menu (such as items, descriptions, prices and photos) are published on a public web address and through QR codes. Anyone with the link can view them. Do not add anything you do not want to be public.</p>
    <p>You are responsible for the accuracy of your menu, including prices, taxes, service charges, availability, and dietary or allergen information.</p>
  </> },
  { title: "Ownership and licence to us", body: <>
    <p>You keep ownership of the content you upload. You confirm you have the rights to it, including photos and logos.</p>
    <p>You give us a worldwide, non-exclusive, royalty-free, transferable licence to host, store, copy, display, adapt (for example resize images or reformat menus) and analyse your content and usage data, in order to:</p>
    <ul>
      <li>operate, secure, support and improve QR Menu, RestroFuel and our related products;</li>
      <li>produce statistics, research and insights, for example typical menu prices or popular categories, which we may share or publish in aggregated or de-identified form;</li>
      <li>show your public menu as an example or showcase in our marketing. You can ask us to stop showcasing your restaurant at any time by emailing {mail}.</li>
    </ul>
    <p>This licence continues for as long as your content is on the service and for a reasonable period afterwards for backups, records and aggregated data already created.</p>
  </> },
  { title: "Communications", body: <p>By creating an account you agree that we may email you about your account, service changes and security. We may also tell you about RestroFuel and our other products and offers. You can opt out of promotional messages at any time using the unsubscribe link or by emailing {mail}. Service and security messages will still be sent.</p> },
  { title: "Acceptable use", body: <>
    <p>You must not use QR Menu to:</p>
    <ul>
      <li>publish unlawful, misleading, hateful, sexually explicit or infringing content;</li>
      <li>impersonate another restaurant or business, or list a business you are not authorised to represent;</li>
      <li>upload malware, or attempt to access other accounts, our systems or data without permission;</li>
      <li>overload, scrape, reverse engineer or resell the service.</li>
    </ul>
  </> },
  { title: "Suspension and termination", body: <p>We may remove content, suspend a menu or disable an account that breaks these Terms, puts others at risk, or where required by law. Where reasonable we will tell you why. You can stop using the service at any time and ask us to delete your account by emailing {mail}.</p> },
  { title: "Disclaimers and liability", body: <>
    <p>To the extent permitted by law, we make no warranties about the service, and we are not liable for indirect or consequential losses, lost profits or revenue, lost data, or for errors in menu content provided by restaurants.</p>
    <p>Because the service is free, our total liability to you for any claim is limited to NPR 5,000.</p>
    <p>You agree to compensate us for claims arising from your content or your breach of these Terms.</p>
  </> },
  { title: "Changes to these Terms", body: <p>We may update these Terms. We will change the “Last updated” date and, for material changes, notify you by email or in the app. If you keep using the service after changes take effect, you accept the updated Terms.</p> },
  { title: "Governing law", body: <p>These Terms are governed by the laws of Nepal. Disputes are subject to the jurisdiction of the courts of Jhapa District, Nepal. We will first try to resolve any concern informally. Please contact us at {mail}.</p> },
];

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" sections={sections}
    intro={<p>Please read these Terms before using QR Menu. In short: the service is free, the restaurant and menu details you publish are public, and we may use that information to run and improve our products, create insights, and promote RestroFuel.</p>} />;
}
