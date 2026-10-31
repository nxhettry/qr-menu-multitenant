import { mkdir, writeFile } from "node:fs/promises";
import { buildPrompt, imageRoot } from "./image-library/style.mjs";
import { loadCatalog, loadSet, validateSets } from "./image-library/catalog.mjs";

const setName = process.argv[2] ?? "pilot";
const catalog = await loadCatalog();
await validateSets(catalog);
const dishes = await loadSet(setName);

const byCategory = Map.groupBy(dishes, dish => catalog.get(dish.slug).category);
let number = 0;
const sections = [...byCategory].map(([category, items]) => {
  const entries = items.map(dish => {
    const covers = dish.covers?.map(slug => catalog.get(slug).name).join(", ");
    return `### ${++number}. ${catalog.get(dish.slug).name}\nSave as: \`${dish.slug}.png\`${covers ? `  \nAlso used for: ${covers}` : ""}\n\n\`\`\`\n${buildPrompt(dish)}\n\`\`\``;
  });
  return `## ${category} (${items.length})\n\n${entries.join("\n\n")}`;
});

const coveredItems = dishes.reduce((total, dish) => total + 1 + (dish.covers?.length ?? 0), 0);
const text = `# Image prompts: ${setName} (${dishes.length} images covering ${coveredItems} menu items)

One prompt per message in **ChatGPT**. Download each result and save it with the filename shown into \`${imageRoot}/chatgpt/\`. Use \`${imageRoot}/gemini/\` for any dish you regenerate in Gemini.

Then run \`npm run images:ingest -- ${setName}\` and open \`${imageRoot}/${setName}-compare.html\`.

Tips: work one category at a time. If an image is square, ask for "4:3 landscape"; ingest crops to 4:3 either way. If a result is wrong, reply with the fix instead of starting over (for example, "make the dumplings crescent-shaped").

${sections.join("\n\n")}
`;

await mkdir("docs/data/image-prompts", { recursive: true });
await writeFile(`docs/data/image-prompts/${setName}.md`, text);
await mkdir(`${imageRoot}/chatgpt`, { recursive: true });
await mkdir(`${imageRoot}/gemini`, { recursive: true });
console.log(`Wrote docs/data/image-prompts/${setName}.md: ${dishes.length} prompts, ${coveredItems} menu items covered`);
