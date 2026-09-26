// Three small drawings of the site. Each step lights one part of the drawing
// and says in words what it is; the same words are listed under "글로 읽기"
// so nothing here depends on seeing the drawing.
export type Part = string;
export type Chapter = { key: string; label: string; title: string; steps: Array<{ part: Part; text: string }> };

export const CHAPTERS: Chapter[] = [
  {
    key: "record", label: "원자료", title: "카드 한 장은 어디서 왔나",
    steps: [
      { part: "headline", text: "맨 위 굵은 한 줄은 요약입니다. 주어는 언제나 말한 사람이고, 임통의 판단을 섞지 않습니다." },
      { part: "quote", text: "그 아래는 말한 그대로의 원문입니다. 말투도 고치지 않습니다." },
      { part: "source", text: "출처를 누르면 영상의 바로 그 구간이 재생됩니다. 영상이 사라져도 그 구간의 원문은 임통에 남습니다." },
      { part: "chain", text: "공개된 기록은 지문을 블록체인에 남깁니다. 지금 화면이 공개 때와 같은지 누구나 대조할 수 있습니다." },
    ],
  },
  {
    key: "views", label: "시선과 관계", title: "사람과 사람은 말로 이어진다",
    steps: [
      { part: "view", text: "시선은 다른 사람이 이 인물을 두고 한 말입니다. 요약의 주어는 평가한 사람입니다." },
      { part: "edge", text: "말 속에 다른 사람이 나오거나 누군가를 평가하면, 두 사람 사이에 선이 하나 생깁니다." },
      { part: "graph", text: "선은 말에서만 생깁니다. 임통은 관계에 '친○', '반○' 같은 이름을 붙이지 않습니다." },
    ],
  },
  {
    key: "play", label: "참여", title: "펀치와 응원은 어떻게 세나",
    steps: [
      { part: "buttons", text: "게임 한 판이나 버튼 한 번이 오늘 이 인물에 대한 입장 1건입니다." },
      { part: "count", text: "오늘 다시 하면 입장이 바뀔 뿐 늘지 않습니다. 게임 점수는 수치와 관계가 없습니다." },
      { part: "ratio", text: "참여가 30명이 되어야 비율을 보여 줍니다. 임통에 온 사람들의 기록일 뿐, 여론조사가 아닙니다." },
    ],
  },
];
