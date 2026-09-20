"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./directory.module.css";

type SubjectCard = {
  id: string;
  name: string;
  category: string;
  kind: "person" | "policy";
  punch: number;
  cheer: number;
  imageUrl?: string;
};

/* 실제 Firestore 콘텐츠가 아직 비어 있어 홈 UI를 검증하기 위한 시범 항목이다.
   운영 콘텐츠 연결 시 이 배열 대신 published subjects + stats 조회 결과를 전달한다. */
const DEMO_SUBJECTS: SubjectCard[] = [
  { id: "demo-1", name: "인물 기록 예시", category: "정치인", kind: "person", punch: 928, cheer: 0 },
  { id: "demo-2", name: "정책 기록 예시", category: "주거 정책", kind: "policy", punch: 1181, cheer: 37 },
  { id: "demo-3", name: "공공 개혁 예시", category: "정책", kind: "policy", punch: 885, cheer: 203 },
  { id: "demo-4", name: "인물 기록 예시 2", category: "법조인", kind: "person", punch: 1428, cheer: 51 },
  { id: "demo-5", name: "지역 정책 예시", category: "지역발전", kind: "policy", punch: 665, cheer: 440 },
  { id: "demo-6", name: "경제 정책 예시", category: "경제", kind: "policy", punch: 420, cheer: 129 },
];

const FILTERS = ["전체", "정치인", "법조인", "경제", "지역발전", "주거 정책", "정책"] as const;

function ratioOf(subject: SubjectCard) {
  const total = subject.punch + subject.cheer;
  return total === 0 ? 0 : Math.round((subject.punch / total) * 100);
}

function count(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function HomeDirectory() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [query, setQuery] = useState("");

  const subjects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    return DEMO_SUBJECTS.filter((subject) => {
      const filterMatch = filter === "전체" || subject.category === filter;
      const queryMatch = !normalized || `${subject.name} ${subject.category}`.toLocaleLowerCase("ko-KR").includes(normalized);
      return filterMatch && queryMatch;
    });
  }, [filter, query]);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="page-title">
        <p className={styles.eyebrow}>JAMTONG PUNCH</p>
        <h1 id="page-title">참여의 흐름을<br />있는 그대로 봅니다.</h1>
        <p>펀치와 응원은 여론조사가 아닌, 이 앱 안에서 확인된 참여 활동입니다.</p>
      </section>

      <section className={styles.directory} aria-labelledby="directory-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="directory-title">인물과 정책</h2>
            <p>시범 데이터 · 사진과 실제 기록은 운영 검토 후 공개됩니다.</p>
          </div>
          <span className={styles.count}>{subjects.length}개</span>
        </div>

        <div className={styles.filters} aria-label="분류 필터">
          {FILTERS.map((item) => (
            <button
              className={`${styles.filter} ${filter === item ? styles.activeFilter : ""}`}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
              aria-pressed={filter === item}
            >
              {item}
            </button>
          ))}
        </div>

        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <span className="srOnly">인물 또는 정책 검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="인물 또는 정책 검색" type="search" />
          {query && <button onClick={() => setQuery("")} type="button" aria-label="검색어 지우기">×</button>}
        </label>

        {subjects.length ? (
          <ul className={styles.grid}>
            {subjects.map((subject) => <SubjectTile key={subject.id} subject={subject} />)}
          </ul>
        ) : (
          <div className={styles.empty}><strong>찾는 항목이 없습니다.</strong><span>다른 검색어 또는 분류를 선택해 보세요.</span></div>
        )}
      </section>
    </main>
  );
}

function SubjectTile({ subject }: { subject: SubjectCard }) {
  const ratio = ratioOf(subject);
  const ringStyle = { "--ratio": `${ratio * 3.6}deg` } as React.CSSProperties;

  return (
    <li>
      <article className={styles.card}>
        <div className={styles.subjectHeader}>
          <Photo subject={subject} />
          <div>
            <span className={styles.kind}>{subject.kind === "person" ? "인물" : "정책"}</span>
            <h3>{subject.name}</h3>
            <p>{subject.category}</p>
          </div>
        </div>

        <div className={styles.cardBottom}>
          <div className={styles.metrics}>
            <span className={styles.punchMetric}><b aria-hidden="true">✦</b> 펀치 {count(subject.punch)}</span>
            <span className={styles.cheerMetric}><b aria-hidden="true">✦</b> 응원 {count(subject.cheer)}</span>
          </div>
          <div className={styles.ring} style={ringStyle} aria-label={`펀치 비율 ${ratio}%`}>
            <div><strong>{ratio}%</strong><span>펀치</span></div>
          </div>
        </div>
      </article>
    </li>
  );
}

function Photo({ subject }: { subject: SubjectCard }) {
  if (subject.imageUrl) return <Image className={styles.photo} src={subject.imageUrl} alt={`${subject.name} 사진`} width={54} height={54} unoptimized />;
  return <div className={styles.photoFallback} aria-hidden="true">{subject.name.slice(0, 1)}</div>;
}
