export type Place = {
  slug: string; name: string; kind: "country" | "city"; areas: string[]; venues: string;
  intro: string;
};

export const places: Place[] = [
  { slug: "nepal", name: "Nepal", kind: "country", areas: ["Kathmandu", "Pokhara", "Lalitpur", "Bhaktapur", "Chitwan", "Biratnagar"], venues: "restaurants, cafés, momo shops, bakeries, hotels and food courts",
    intro: "From a Thamel momo counter to a Pokhara lakeside café, every Nepali eatery can put its full menu on guests’ phones with one QR code." },
  { slug: "kathmandu", name: "Kathmandu", kind: "city", areas: ["Thamel", "Durbar Marg", "Lazimpat", "Baneshwor", "Baluwatar", "Boudha"], venues: "restaurants, rooftop cafés, momo shops and tourist-area eateries",
    intro: "Kathmandu’s busy dining streets and tourist areas make a bilingual, always-current menu especially useful." },
  { slug: "pokhara", name: "Pokhara", kind: "city", areas: ["Lakeside", "Damside", "Chipledhunga", "Bagar"], venues: "lakeside restaurants, cafés, bakeries and trekking-town eateries",
    intro: "Visitors in Pokhara want to read a menu in English before they sit down, and locals want it in Nepali. One QR menu serves both." },
  { slug: "lalitpur", name: "Lalitpur", kind: "city", areas: ["Patan", "Jawalakhel", "Jhamsikhel", "Kupondol", "Pulchowk"], venues: "heritage-area restaurants, cafés and bakeries",
    intro: "Lalitpur’s restaurants and cafés can update prices and specials from their phones without reprinting a thing." },
  { slug: "bhaktapur", name: "Bhaktapur", kind: "city", areas: ["Durbar Square", "Suryabinayak", "Thimi"], venues: "traditional restaurants, juju dhau shops and cafés",
    intro: "Share Bhaktapur’s traditional dishes with visitors and locals alike through a clean, fast QR menu." },
  { slug: "chitwan", name: "Chitwan", kind: "city", areas: ["Bharatpur", "Sauraha", "Narayangarh"], venues: "restaurants, jungle-lodge dining rooms and cafés",
    intro: "Lodges and restaurants around Chitwan can offer guests a menu in English and Nepali on any phone." },
  { slug: "biratnagar", name: "Biratnagar", kind: "city", areas: ["Main Road", "Traffic Chowk", "Rani"], venues: "restaurants, sweet shops, cafés and fast-food counters",
    intro: "Biratnagar’s eateries can keep a living menu online and change prices the moment costs change." },
  { slug: "butwal", name: "Butwal", kind: "city", areas: ["Traffic Chowk", "Golpark", "Milanchowk"], venues: "restaurants, cafés, bakeries and food courts",
    intro: "Butwal restaurants can swap a worn laminated menu for a QR code that is always up to date." },
  { slug: "dharan", name: "Dharan", kind: "city", areas: ["Bhanu Chowk", "Chatta Chowk", "Bishnu Paduka"], venues: "restaurants, tea shops and cafés",
    intro: "Dharan’s cafés and eateries can mark dishes sold out in one tap and keep guests informed." },
  { slug: "janakpur", name: "Janakpur", kind: "city", areas: ["Janaki Mandir area", "Station Road", "Dhanusha"], venues: "restaurants, sweet shops and cafés",
    intro: "Janakpur’s restaurants and sweet shops can show their dishes and prices clearly to every visitor." },
  { slug: "nepalgunj", name: "Nepalgunj", kind: "city", areas: ["Tribhuvan Chowk", "Dhamboji", "Bageshwori"], venues: "restaurants, cafés and food stalls",
    intro: "Nepalgunj eateries can go digital without new hardware, using only the phones they already have." },
  { slug: "hetauda", name: "Hetauda", kind: "city", areas: ["Bhaisepati", "Hetauda Chowk", "Makwanpur"], venues: "restaurants, cafés and highway eateries",
    intro: "Hetauda’s restaurants and highway stops can give travellers a quick, readable menu on their phones." },
];

export const findPlace = (slug: string) => places.find(place => place.slug === slug);
