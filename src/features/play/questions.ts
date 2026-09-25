import type { Bracket } from "@/content/schema";

// Fixed wording only (implementation-design 7.5): a question users could
// write would become a statement the service publishes.
export const QUESTIONS: Record<Bracket["questionId"], string> = {
  "more-problematic": "어느 쪽이 더 문제인가?",
  "more-urgent": "어느 쪽이 더 시급한가?",
};
