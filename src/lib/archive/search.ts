import type { EvaluationView, PersonView, StatementView, TopicView } from "@/lib/archive/read";

// Plain substring search over what is already cached. Every word of the query
// must appear somewhere in a record (name, headline, quote, context, topics);
// hits in the headline or name rank first. Fine at archive sizes in the
// hundreds; a search index replaces it later (docs/roadmap.md 기술 부채).
export type SearchResults = { people: PersonView[]; statements: StatementView[]; evaluations: EvaluationView[] };

const LIMIT = 30;

function words(query: string): string[] {
  return query.toLowerCase().split(/\s+/).map((word) => word.trim()).filter((word) => word.length > 0).slice(0, 8);
}

function rank<T>(items: T[], terms: string[], fields: (item: T) => { title: string; body: string }): T[] {
  return items
    .map((item) => {
      const { title, body } = fields(item);
      const titleText = title.toLowerCase();
      const all = `${titleText} ${body.toLowerCase()}`;
      if (!terms.every((term) => all.includes(term))) return null;
      return { item, score: terms.filter((term) => titleText.includes(term)).length };
    })
    .filter((entry): entry is { item: T; score: number } => entry !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, LIMIT)
    .map((entry) => entry.item);
}

export function searchArchive(query: string, data: { people: PersonView[]; statements: StatementView[]; evaluations: EvaluationView[]; topics: TopicView[] }): SearchResults {
  const terms = words(query);
  if (!terms.length) return { people: [], statements: [], evaluations: [] };
  const names = new Map(data.people.map((person) => [person.id, person.name]));
  const topicNames = new Map(data.topics.map((topic) => [topic.id, topic.name]));
  const topicsOf = (ids: string[]) => ids.map((id) => topicNames.get(id) ?? "").join(" ");
  return {
    people: rank(data.people, terms, (person) => ({ title: `${person.name} ${person.aliases.join(" ")}`, body: `${person.summary} ${person.roles.map((role) => role.title).join(" ")}` })),
    statements: rank(data.statements, terms, (statement) => ({
      title: `${statement.headline} ${names.get(statement.personId) ?? ""}`,
      body: `${statement.quote ?? ""} ${statement.context} ${topicsOf(statement.topicIds)}`,
    })),
    evaluations: rank(data.evaluations, terms, (evaluation) => ({
      title: `${evaluation.claim} ${evaluation.evaluator.name} ${names.get(evaluation.targetPersonId) ?? ""}`,
      body: `${evaluation.quote ?? ""} ${evaluation.evaluator.descriptor} ${topicsOf(evaluation.topicIds)}`,
    })),
  };
}
