export const imageRoot = "artifacts/dish-images";
export const providers = ["chatgpt", "gemini"];
export const masterSize = { width: 1600, height: 1200 };

export function buildPrompt({ description, vessel, angle = "45 degree", surface = "light grey stone" }) {
  return `Photorealistic food photograph of ${description}, served ${vessel}. ${angle} view, soft natural window light, neutral ${surface} background, appetising, realistic home-style presentation. 4:3 landscape. No text, no logo, no people, no hands.`;
}
