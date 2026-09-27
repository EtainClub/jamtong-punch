// Doors for people who do not follow politics: they start from their own
// life, not from a politician's name. Each door opens an existing topic and
// shows only once that topic has published records.
export const LIFE_DOORS = [
  { topicId: "real-estate", icon: "🏠", about: "집값·공급·부동산 세금을 두고 한 말과 그 뒤 통계" },
  { topicId: "prices-energy", icon: "⛽", about: "기름값·장바구니 물가를 두고 한 말과 그 뒤 가격" },
  { topicId: "stock-market-economy", icon: "📈", about: "코스피·환율·금리를 두고 한 말과 그 뒤 지표" },
  { topicId: "jobs", icon: "💼", about: "일자리·임금을 두고 한 말과 그 뒤 고용 통계" },
] as const;

export const lifeDoor = (topicId: string) => LIFE_DOORS.find((door) => door.topicId === topicId);
