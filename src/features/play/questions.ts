import type { QUESTION_IDS } from "@/lib/comparison/schema";

// Fixed wording only (implementation-design 7.5): a question users could
// write would become a statement the service publishes.
export const QUESTIONS: Record<(typeof QUESTION_IDS)[number], string> = {
  "more-problematic": "어느 쪽이 더 문제인가?",
  "more-urgent": "어느 쪽이 더 시급한가?",
  "more-punch": "더 펀치하고 싶은 사람은?",
  "more-cheer": "더 응원하고 싶은 사람은?",
};
