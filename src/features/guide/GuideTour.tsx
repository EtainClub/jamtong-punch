"use client";

import { useState } from "react";
import { CHAPTERS, type Part } from "./chapters";
import styles from "./guide.module.css";

export function GuideTour() {
  const [chapter, setChapter] = useState(0);
  const [step, setStep] = useState(0);
  const current = CHAPTERS[chapter];
  const lit = current.steps[step].part;
  const on = (part: Part) => (lit === part ? styles.lit : styles.dim);
  const choose = (index: number) => { setChapter(index); setStep(0); };

  return <div className={styles.tour}>
    <div className={styles.tourTabs} role="tablist" aria-label="그림 고르기">
      {CHAPTERS.map((item, index) => <button key={item.key} type="button" role="tab" aria-selected={index === chapter} onClick={() => choose(index)}>
        <small>0{index + 1}</small>{item.label}
      </button>)}
    </div>

    <div className={styles.stage} aria-hidden="true">
      <p className={styles.stageTitle}>{current.title}</p>
      {current.key === "record" && <div className={styles.mockCard}>
        <p className={styles.mockMeta}><span className={styles.mockAvatar}>유</span>유시민 · 2026.08.24 · 인터뷰</p>
        <p className={`${styles.mockHeadline} ${on("headline")}`}>이재명 대통령을 ‘오만한 권력자’라 하고 윤석열 전 대통령에 비유함</p>
        <p className={`${styles.mockQuote} ${on("quote")}`}>“지금 1년 동안 대통령이 보인 모습은 권력자의 모습, 그것도 오만한 권력자의 모습이라고 저는 생각해요.”</p>
        <div className={styles.mockRow}>
          <span className={`${styles.mockChip} ${on("source")}`}>▶ 방송 영상 00:19–00:29</span>
          <span className={`${styles.mockChip} ${on("chain")}`}>⛓ 블록체인 대조</span>
        </div>
      </div>}
      {current.key === "views" && <div className={styles.mockViews}>
        <div className={`${styles.mockCard} ${on("view")}`}>
          <p className={styles.mockMeta}><span className={styles.mockAvatar}>조</span>조하나 → 김어준</p>
          <p className={styles.mockHeadline}>조하나는 김어준이 지지율 하락을 ‘코어 지지층 이탈’로 설명하는 것을 비판했다.</p>
        </div>
        <svg className={styles.mockGraph} viewBox="0 0 240 120">
          <g className={on("graph")}>
            <line x1="60" y1="40" x2="180" y2="30" />
            <line x1="180" y1="30" x2="150" y2="95" />
          </g>
          <line className={`${styles.mockEdge} ${on("edge")}`} x1="60" y1="40" x2="150" y2="95" />
          <g className={on("graph")}>
            <circle cx="180" cy="30" r="14" /><text x="180" y="35">유</text>
          </g>
          <circle cx="60" cy="40" r="14" /><text x="60" y="45">조</text>
          <circle cx="150" cy="95" r="14" /><text x="150" y="100">김</text>
        </svg>
      </div>}
      {current.key === "play" && <div className={styles.mockCard}>
        <div className={`${styles.mockRow} ${on("buttons")}`}>
          <span className={styles.mockPunch}>👊 펀치</span>
          <span className={styles.mockCheer}>👏 응원</span>
        </div>
        <p className={`${styles.mockCount} ${on("count")}`}>오늘 이 인물에 대한 내 입장 <b>1건</b></p>
        <div className={on("ratio")}>
          <div className={styles.mockBar}><span style={{ width: "58%" }} /></div>
          <p className={styles.mockNote}>30일 · 참여 30명부터 비율을 표시합니다</p>
        </div>
      </div>}
    </div>

    <p className={styles.caption} aria-live="polite">{current.steps[step].text}</p>
    <div className={styles.stepper}>
      <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} aria-label="이전 단계">←</button>
      <span>{step + 1} / {current.steps.length}</span>
      {step < current.steps.length - 1
        ? <button type="button" onClick={() => setStep(step + 1)} aria-label="다음 단계">→</button>
        : <button type="button" onClick={() => choose((chapter + 1) % CHAPTERS.length)} aria-label="다음 그림">{chapter < CHAPTERS.length - 1 ? "다음 그림 →" : "처음으로 ↺"}</button>}
    </div>
  </div>;
}
