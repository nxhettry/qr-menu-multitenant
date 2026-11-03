export type Faq = { question: string; answer: string };

export const generalFaqs: Faq[] = [
  { question: "Is QR Menu really free for restaurants in Nepal?", answer: "Yes. QR Menu is free for every restaurant, café and food stall. You can create a menu, publish it and print your QR code without paying anything." },
  { question: "Do my guests need to install an app?", answer: "No. Guests scan the QR code with their phone camera and your menu opens instantly in the browser, in English or नेपाली, in light or dark mode." },
  { question: "Can I show my menu in both English and Nepali?", answer: "Yes. Add Nepali names and descriptions beside the English ones and guests see both. You can hide the Nepali text from your menu display settings." },
  { question: "How fast do price changes appear on the menu?", answer: "Immediately. Saved edits go live the moment you save, so you never have to reprint a menu or QR code when a price changes." },
  { question: "Will my printed QR code stop working if I rename my restaurant?", answer: "No. Every menu gets a permanent short link. Rename your restaurant later and printed QR codes keep working." },
  { question: "Can I import an existing menu from Excel?", answer: "Yes. Fill in the spreadsheet template or upload a CSV and import up to 200 dishes in one go." },
  { question: "Does it handle VAT and service charge?", answer: "Yes. Set your VAT percentage and whether your prices include VAT, plus a service charge. Guests always see clear final prices in Nepalese rupees." },
];

export const faqJsonLd = (faqs: Faq[]) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
});
