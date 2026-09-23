import { rebuildDerivedContent } from "../src/lib/content/store";

// Recomputes relationships and people/topic counts from published content.
// Safe to run at any time: every derived document is rebuilt from its sources.
async function main() {
  const result = await rebuildDerivedContent();
  console.log(`rebuilt ${result.relationships} relationships, ${result.people} people, ${result.topics} topics`);
}

void main();
