// Starter menus: [category, subcategory, name, name_ne, type]. Prices are left blank on purpose so owners enter their own.
const V = "Veg", N = "Non-veg", E = "Egg";

export const starterMenus = {
  "momo-fast-food": [
    ["Momo", "Steamed", "Buff momo", "बफ म:म:", N], ["Momo", "Steamed", "Chicken momo", "चिकेन म:म:", N], ["Momo", "Steamed", "Veg momo", "भेज म:म:", V], ["Momo", "Steamed", "Cheese momo", "चिज म:म:", V],
    ["Momo", "Fried", "Fried buff momo", "फ्राइड बफ म:म:", N], ["Momo", "Fried", "Fried chicken momo", "फ्राइड चिकेन म:म:", N], ["Momo", "Fried", "Fried veg momo", "फ्राइड भेज म:म:", V],
    ["Momo", "Jhol & chilli", "Jhol momo", "झोल म:म:", N], ["Momo", "Jhol & chilli", "Chilli momo", "चिली म:म:", N], ["Momo", "Jhol & chilli", "C momo", "सी म:म:", N],
    ["Noodles & soup", "", "Veg chowmein", "भेज चाउमिन", V], ["Noodles & soup", "", "Egg chowmein", "एग चाउमिन", E], ["Noodles & soup", "", "Chicken chowmein", "चिकेन चाउमिन", N], ["Noodles & soup", "", "Buff chowmein", "बफ चाउमिन", N],
    ["Noodles & soup", "", "Veg thukpa", "भेज थुक्पा", V], ["Noodles & soup", "", "Chicken thukpa", "चिकेन थुक्पा", N], ["Noodles & soup", "", "Buff thukpa", "बफ थुक्पा", N],
    ["Fast food", "", "French fries", "फ्रेन्च फ्राइज", V], ["Fast food", "", "Veg burger", "भेज बर्गर", V], ["Fast food", "", "Chicken burger", "चिकेन बर्गर", N], ["Fast food", "", "Veg sandwich", "भेज स्यान्डविच", V], ["Fast food", "", "Chicken sandwich", "चिकेन स्यान्डविच", N], ["Fast food", "", "Chicken nuggets", "", N], ["Fast food", "", "Chicken pizza", "चिकेन पिज्जा", N],
    ["Drinks", "", "Milk tea", "दूध चिया", V], ["Drinks", "", "Black tea", "कालो चिया", V], ["Drinks", "", "Lassi", "लस्सी", V], ["Drinks", "", "Soft drink (bottle)", "", V], ["Drinks", "", "Mineral water", "", V],
  ],
  cafe: [
    ["Coffee", "", "Espresso", "", V], ["Coffee", "", "Americano", "", V], ["Coffee", "", "Cappuccino", "", V], ["Coffee", "", "Latte", "", V], ["Coffee", "", "Mocha", "", V], ["Coffee", "", "Cold coffee", "", V],
    ["Tea", "", "Milk tea", "दूध चिया", V], ["Tea", "", "Black tea", "कालो चिया", V], ["Tea", "", "Masala tea", "मसला चिया", V], ["Tea", "", "Lemon tea", "लेमन चिया", V], ["Tea", "", "Green tea", "", V],
    ["Cold drinks", "", "Fresh lemonade", "", V], ["Cold drinks", "", "Iced tea", "", V], ["Cold drinks", "", "Lassi", "लस्सी", V], ["Cold drinks", "", "Mineral water", "", V],
    ["Shakes & smoothies", "", "Banana shake", "", V], ["Shakes & smoothies", "", "Chocolate milkshake", "", V], ["Shakes & smoothies", "", "Oreo shake", "", V], ["Shakes & smoothies", "", "Mango smoothie", "", V],
    ["Bakery", "", "Chocolate cake slice", "", E], ["Bakery", "", "Cheesecake slice", "", E], ["Bakery", "", "Brownie", "", E], ["Bakery", "", "Croissant", "", E],
    ["Light bites", "", "Veg sandwich", "भेज स्यान्डविच", V], ["Light bites", "", "Chicken sandwich", "चिकेन स्यान्डविच", N], ["Light bites", "", "French fries", "फ्रेन्च फ्राइज", V], ["Light bites", "", "Garlic bread", "", V], ["Light bites", "", "White sauce pasta", "", V],
  ],
  "nepali-thali": [
    ["Thali & sets", "", "Veg thali", "भेज थाली", V], ["Thali & sets", "", "Chicken thali", "चिकेन थाली", N], ["Thali & sets", "", "Mutton thali", "खसी थाली", N], ["Thali & sets", "", "Fish thali", "माछा थाली", N], ["Thali & sets", "", "Dal bhat tarkari set", "दाल भात तरकारी सेट", V],
    ["Curries", "", "Dal", "दाल", V], ["Curries", "", "Gundruk soup", "गुन्द्रुक झोल", V], ["Curries", "", "Saag", "साग", V], ["Curries", "", "Aloo tama", "आलु तामा", V], ["Curries", "", "Chicken curry", "चिकेन तरकारी", N], ["Curries", "", "Mutton curry", "खसीको मासु", N],
    ["Snacks & khaja", "Newari", "Choila", "चोइला", N], ["Snacks & khaja", "Newari", "Chatamari", "चताम्री", V], ["Snacks & khaja", "Newari", "Bara", "वा", E], ["Snacks & khaja", "Newari", "Samay baji set", "समय बजी सेट", N],
    ["Snacks & khaja", "Street snacks", "Sel roti", "सेल रोटी", V], ["Snacks & khaja", "Street snacks", "Aloo tareko", "आलु तारेको", V], ["Snacks & khaja", "Street snacks", "Chatpate", "चटपटे", V], ["Snacks & khaja", "Street snacks", "Buff sukuti", "बफ सुकुटी", N], ["Snacks & khaja", "Street snacks", "Bhatmas sadeko", "भटमास सदेको", V],
    ["Sweets", "", "Kheer", "खीर", V], ["Sweets", "", "Sikarni", "सिकर्णी", V], ["Sweets", "", "Juju dhau", "जुजु धौ", V], ["Sweets", "", "Gulab jamun", "गुलाब जामुन", V], ["Sweets", "", "Lalmohan", "लालमोहन", V],
    ["Drinks", "", "Lassi", "लस्सी", V], ["Drinks", "", "Masala tea", "मसला चिया", V], ["Drinks", "", "Mineral water", "", V],
  ],
  "bar-restaurant": [
    ["Starters", "Veg", "Paneer chilli", "", V], ["Starters", "Veg", "Peanut masala", "", V], ["Starters", "Veg", "French fries", "फ्रेन्च फ्राइज", V], ["Starters", "Veg", "Veg spring roll", "", V],
    ["Starters", "Non-veg", "Chicken chilli", "चिकेन चिली", N], ["Starters", "Non-veg", "Chicken lollipop", "", N], ["Starters", "Non-veg", "Buff sukuti", "बफ सुकुटी", N], ["Starters", "Non-veg", "Choila", "चोइला", N], ["Starters", "Non-veg", "Fish fry", "", N],
    ["Tandoor", "", "Chicken tandoori", "", N], ["Tandoor", "", "Chicken tikka", "", N], ["Tandoor", "", "Paneer tikka", "", V],
    ["Main course", "Veg", "Paneer butter masala", "", V], ["Main course", "Veg", "Dal fry", "", V], ["Main course", "Veg", "Mixed vegetable curry", "", V],
    ["Main course", "Non-veg", "Butter chicken", "", N], ["Main course", "Non-veg", "Chicken curry", "चिकेन तरकारी", N], ["Main course", "Non-veg", "Mutton rogan josh", "", N], ["Main course", "Non-veg", "Egg curry", "", E],
    ["Rice & bread", "", "Steamed rice", "", V], ["Rice & bread", "", "Jeera rice", "", V], ["Rice & bread", "", "Veg fried rice", "", V], ["Rice & bread", "", "Chicken fried rice", "", N], ["Rice & bread", "", "Chicken biryani", "", N], ["Rice & bread", "", "Tandoori roti", "", V], ["Rice & bread", "", "Butter naan", "", V],
    ["Drinks", "Alcohol", "Draught beer", "", ""], ["Drinks", "Alcohol", "Bottled beer", "", ""], ["Drinks", "Alcohol", "Whisky (peg)", "", ""], ["Drinks", "Alcohol", "Vodka (peg)", "", ""], ["Drinks", "Alcohol", "Rum (peg)", "", ""], ["Drinks", "Alcohol", "Wine (glass)", "", ""],
    ["Drinks", "Soft drinks", "Soft drink (bottle)", "", V], ["Drinks", "Soft drinks", "Fresh lime soda", "", V], ["Drinks", "Soft drinks", "Mineral water", "", V],
  ],
};
