import type { Metadata } from "next";
import Link from "next/link";
import { ShareButton } from "@/features/archive/ShareButton";
import { KIM_BU_SEON_TOPIC, referenceVideo, relatedVoices, researchSources, timelineEntries, timelinePeriods, type ResearchSourceId, type TimelineCategory } from "@/content/kim-bu-seon-timeline";
import { SiteHeader } from "@/features/archive/components";
import archive from "@/features/archive/archive.module.css";
import { shareMetadata } from "@/lib/site";
import styles from "./timeline.module.css";

export const metadata: Metadata = shareMetadata(KIM_BU_SEON_TOPIC.title, KIM_BU_SEON_TOPIC.description, `/topics/${KIM_BU_SEON_TOPIC.id}`);

const categories: readonly TimelineCategory[] = ["의혹·반박", "선거·보도", "수사·소송", "후속 발언"];
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function References({ ids }: { ids: readonly ResearchSourceId[] }) {
  return <ul className={styles.references} aria-label="근거 자료">{ids.map((id) => {
    const source = researchSources[id];
    return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt}<span className={archive.visuallyHidden}> · {source.title} (새 창)</span> ↗</a></li>;
  })}</ul>;
}

export default async function KimBuSeonTimelinePage({ searchParams }: Props) {
  const query = await searchParams;
  const category = categories.find((item) => item === query.category);
  const newest = query.order === "newest";
  const entries = timelineEntries.filter((entry) => !category || entry.category === category).sort((a, b) => a.date.localeCompare(b.date));
  const periods = newest ? [...timelinePeriods].reverse() : timelinePeriods;
  const sourceIds = Object.keys(researchSources) as ResearchSourceId[];

  return <>
    <SiteHeader current="topics" />
    <main className={archive.shell}>
      <section className={archive.hero}>
        <Link className={styles.back} href="/topics">← 쟁점 목록</Link>
        <p className={archive.eyebrow}>쟁점 조사 · 의혹 / 반박 / 검증</p>
        <div className={archive.detailTitle}><h1>{KIM_BU_SEON_TOPIC.title}</h1><ShareButton path={`/topics/${KIM_BU_SEON_TOPIC.id}`} title={KIM_BU_SEON_TOPIC.title} prominent /></div>
        <p>{KIM_BU_SEON_TOPIC.description}</p>
        <p className={styles.meta}>조사 기준 {KIM_BU_SEON_TOPIC.reviewedAt} · 연표 {timelineEntries.length}개 항목 · 관련 인물 {relatedVoices.length}명 · 자료 {sourceIds.length}개</p>
      </section>

      <section className={styles.overview} aria-labelledby="current-status">
        <h2 id="current-status">현재 확인되는 결과</h2>
        <article>
          <h3>2018년 · 검찰 불기소</h3>
          <p>스캔들 부인 발언의 선거법 위반은 기소되지 않았다. 검찰은 교제 주장을 뒷받침할 객관적 증거가 부족하다고 설명했다. 김부선·김영환의 공모를 주장한 맞고발도 불기소됐다.</p>
          <References ids={["prosecution", "decision"]} />
        </article>
        <article>
          <h3>2022년 · 민사 소 취하서 제출</h3>
          <p>김부선 측이 7월 8일 손해배상 소송 취하서를 냈다. 취하서 제출 확인과 최종 종결 확인은 구분하며, 본안 판단으로 승패가 정해진 것으로 기록하지 않는다.</p>
          <References ids={["civilWithdrawal"]} />
        </article>
        <article>
          <h3>최근 · 발언과 선거에서의 재거론</h3>
          <p>이번 조사에서 보도로 확인한 마지막 당사자 후속 발언은 {KIM_BU_SEON_TOPIC.latestVerifiedDevelopment} 메시지다. 2026년 10월 4일까지 검색했지만 이 의혹의 결론을 바꾸는 새 판결·수사 처분은 확보하지 못했다. 이는 새 자료가 존재하지 않는다는 뜻은 아니다.</p>
          <References ids={["message2025"]} />
        </article>
      </section>

      <section className={styles.analysis} aria-labelledby="coordination">
        <h2 id="coordination">조직적 개입 의혹: 어디까지 확인됐나</h2>
        <h3>공개적으로 확인되는 정치적 활용</h3>
        <p>후보 토론, 기자회견, 법률대리인의 소송 참여, 선거 유세에서 이 의혹이 반복적으로 활용됐다. 김부선은 2022년 기자회견에서 이재명의 당선을 막으려 한다는 목적을 밝혔고, 같은 해 강용석과 서로 정치적 사심이 있었다고 설명했다.</p>
        <References ids={["conference2022", "civilWithdrawalSeoul", "campaign2025"]} />
        <h3>의심을 제기한 당사자들의 말</h3>
        <p>이재명은 2018년 녹취 유포를 정치공작으로 의심했다. 김부선은 자신의 배후에 불순세력이 있다는 취지의 주장을 반박했다. 어느 쪽이든 발언의 존재와 그 내용이 입증됐는지는 별개다.</p>
        <References ids={["denial", "mediaDispute"]} />
        <h3>공모에 관한 실제 수사 판단</h3>
        <p>2018년 검찰은 김영환이 김부선의 말을 사실로 믿은 것으로 보고, 김부선이 자신의 말을 토론회에서 사용할 것을 알았다고 보기 어려워 공모를 인정하기 어렵다고 설명했다. 따라서 이 사건이 조직적 조작으로 사법적으로 확정됐다는 결론은 현재 확보한 자료에서 뒷받침되지 않는다.</p>
        <References ids={["prosecution"]} />
        <h3>추가 확인이 필요한 자료</h3>
        <p>최초 녹취 유포 경위와 편집 전 원본, KBS 인터뷰의 섭외·편집 기록, 당사자 사이의 실제 지시·연락 자료, 후속 고발의 최종 처분이 필요하다. 발언자 여러 명의 같은 전언을 각각 독립된 증거로 세지 않는다.</p>
      </section>

      <section className={styles.voicesSection} aria-labelledby="related-voices">
        <h2 id="related-voices">관련 인물과 당시 발언</h2>
        <p>김부선을 옹호한 발언부터 해명 요구, 수사 신중론, 언론 비판까지 함께 살폈다. 인물의 역할은 발언 당시 기준이며, 아래 요약은 직접 인용문이 아니다.</p>
        <div className={styles.voicesGrid}>{relatedVoices.map((voice) => <details className={styles.voice} key={voice.name}>
          <summary><span className={styles.voiceHeading}><strong>{voice.name}</strong><span className={styles.badge}>{voice.stance}</span></span><span className={styles.meta}>{voice.role} · {voice.dateLabel}</span></summary>
          <p>{voice.summary}</p>
          <p className={styles.limit}><strong>확인 범위</strong>{voice.limit}</p>
          <References ids={voice.sources} />
        </details>)}</div>
        <p className={styles.meta}>추가 확인: 최욱의 김부선 신뢰 발언은 원방송과 발언 구간을 확보한 뒤 보강한다. 민주당 소속이라는 이유만으로 같은 입장을 표시하지 않는다.</p>
      </section>

      <aside className={styles.video} aria-labelledby="reference-video">
        <p className={styles.meta}>사용자가 제공한 참고 영상</p>
        <h2 id="reference-video"><a href={referenceVideo.url} target="_blank" rel="noreferrer">{referenceVideo.title} ↗</a></h2>
        <p>{referenceVideo.channel} · {referenceVideo.publishedAt} · {referenceVideo.durationSec}초 · 내용 미확인</p>
        <p className={styles.limit}>{referenceVideo.note}</p>
        <Link href={`/topics/${KIM_BU_SEON_TOPIC.id}#kbs-interview`}>관련 연표: 2018년 KBS 인터뷰</Link>
      </aside>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <h2 id="timeline-title">진행 타임라인</h2>
        <p>주장 속 사건 시기와 공개 발언·보도·절차 날짜를 구분했다. 정확한 날이 확인되지 않은 항목은 범위나 보도일을 표시했다.</p>
        <form className={styles.filters} action={`/topics/${KIM_BU_SEON_TOPIC.id}#timeline-title`} method="get">
          <label>기록 종류<select name="category" defaultValue={category ?? ""}><option value="">전체</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>읽는 순서<select name="order" defaultValue={newest ? "newest" : "oldest"}><option value="oldest">처음부터</option><option value="newest">최근부터</option></select></label>
          <button type="submit">적용</button>
        </form>
        <p className={styles.meta}>{entries.length}개 항목 표시</p>
        <nav className={styles.periodNav} aria-label="시기별 바로가기">
          {periods.filter((period) => entries.some((entry) => entry.period === period.id)).map((period) => <a key={period.id} href={`#period-${period.id}`}>{period.range}</a>)}
        </nav>
        {periods.map((period) => {
          const items = entries.filter((entry) => entry.period === period.id);
          if (!items.length) return null;
          if (newest) items.reverse();
          return <section key={period.id} className={styles.period} aria-labelledby={`period-${period.id}`}>
            <div className={styles.periodHead}><span>{period.range}</span><h3 id={`period-${period.id}`}>{period.title}</h3><p>{period.description}</p></div>
            <ol className={styles.timeline}>{items.map((entry) => <li key={entry.id} id={entry.id}>
              <article className={styles.entry}>
                <div className={styles.entryMeta}><span>{entry.dateLabel}</span><span className={styles.badge}>{entry.category}</span></div>
                <h4><a href={`#${entry.id}`}>{entry.title}</a></h4>
                <p>{entry.body}</p>
                <p className={styles.limit}><strong>확인 범위</strong> {entry.limit}</p>
                <References ids={entry.sources} />
              </article>
            </li>)}</ol>
          </section>;
        })}
      </section>

      <section className={styles.method} aria-labelledby="method">
        <h2 id="method">자료와 조사 범위</h2>
        <p>공개 뉴스의 본문 또는 검색 색인에 노출된 내용을 대조해 작성했다. 출처 목록에는 두 확인 수준을 구분해 적었다. 초기 한겨레 원문, 과거 SNS 원본, 판결·처분 기록 전문, 제공된 쇼츠의 전사와 원방송은 확보하지 못했다.</p>
        <p>2019년 공익고발단의 후속 고발 결과와 2022년 민사 사건의 최종 종결 기록은 추가 확인 대상이다. 2023~2026년 일반적인 정치 평가, 재업로드, 동명이인 자료는 새로운 사건 진행으로 포함하지 않았다.</p>
        <details><summary>자료 {sourceIds.length}개와 확인 수준 보기</summary>
          <ol className={styles.sourceList}>{sourceIds.map((id) => {
            const source = researchSources[id];
            return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.publisher} · {source.publishedAt} · {source.access}</p></li>;
          })}</ol>
        </details>
      </section>
    </main>
  </>;
}
