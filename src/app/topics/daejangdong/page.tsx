import type { Metadata } from "next";
import Link from "next/link";
import { ShareButton } from "@/features/archive/ShareButton";
import { DAEJANGDONG_TOPIC, caseTracks, relatedVoices, researchSources, timelineCategories, timelineEntries, timelinePeriods, type ResearchSourceId } from "@/content/daejangdong-timeline";
import { SiteHeader } from "@/features/archive/components";
import archive from "@/features/archive/archive.module.css";
import { shareMetadata } from "@/lib/site";
import styles from "../kim-bu-seon-scandal/timeline.module.css";

export const metadata: Metadata = shareMetadata(DAEJANGDONG_TOPIC.title, DAEJANGDONG_TOPIC.description, `/topics/${DAEJANGDONG_TOPIC.id}`);
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function References({ ids }: { ids: readonly ResearchSourceId[] }) {
  return <ul className={styles.references} aria-label="근거 자료">{ids.map((id) => {
    const source = researchSources[id];
    return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt}<span className={archive.visuallyHidden}> · {source.title} (새 창)</span> ↗</a></li>;
  })}</ul>;
}

export default async function DaejangdongTimelinePage({ searchParams }: Props) {
  const query = await searchParams;
  const category = timelineCategories.find((item) => item === query.category);
  const track = caseTracks.find((item) => item === query.track);
  const newest = query.order === "newest";
  const entries = timelineEntries.filter((entry) => (!category || entry.category === category) && (!track || entry.track === track)).sort((a, b) => a.date.localeCompare(b.date));
  const periods = newest ? [...timelinePeriods].reverse() : timelinePeriods;
  const sourceIds = Object.keys(researchSources) as ResearchSourceId[];

  return <>
    <SiteHeader current="topics" />
    <main className={archive.shell}>
      <section className={archive.hero}>
        <Link className={styles.back} href="/topics">← 쟁점 목록</Link>
        <p className={archive.eyebrow}>쟁점 조사 · 사업 / 수사 / 재판 / 발언</p>
        <div className={archive.detailTitle}><h1>{DAEJANGDONG_TOPIC.title}</h1><ShareButton path={`/topics/${DAEJANGDONG_TOPIC.id}`} title={DAEJANGDONG_TOPIC.title} prominent /></div>
        <p>{DAEJANGDONG_TOPIC.description}</p>
        <p className={styles.meta}>조사 기준 {DAEJANGDONG_TOPIC.reviewedAt} · 연표 {timelineEntries.length}개 항목 · 관련 인물 {relatedVoices.length}명 · 자료 {sourceIds.length}개</p>
      </section>

      <section className={styles.overview} aria-labelledby="current-status">
        <h2 id="current-status">사건별로 확인되는 경과</h2>
        <article><h3>민간업자 등 5인 · 1심 선고 후 항소심</h3><p>2025년 10월 1심에서 업무상 배임 유죄 등이 선고됐다. 검찰은 항소하지 않았지만 피고인들이 항소했다. 이번 조사에서 확인한 최근 공판은 2026년 9월 18일이며, 보도상 결심 예정일은 11월 27일이다.</p><References ids={["mainVerdict", "latestTestimony"]} /></article>
        <article><h3>이재명·정진상 · 별도의 재판</h3><p>2025년 6월 이재명의 재판 기일은 대통령 취임 뒤 추후 지정됐다. 정진상의 재판은 계속 진행하는 것으로 보도됐다. 민간업자에 대한 선고를 두 사람의 판결로 대신하지 않는다.</p><References ids={["leeDelay"]} /></article>
        <article><h3>김용 · 정치자금·뇌물 사건</h3><p>2025년 2월 항소심에서 징역 5년이 선고됐고, 8월에는 보석이 허가됐다. 2026년 7월 보도는 상고심 심리 중이라고 전했다. 이후 확정판결 원문은 이번 조사에서 확보하지 못했다.</p><References ids={["kimAppeal", "kimBail", "kimRecords"]} /></article>
        <article><h3>50억 클럽 · 곽상도 관련 재판</h3><p>2026년 4월 재개된 뇌물 항소심과 2월 검찰이 항소한 범죄수익 은닉 사건은 별개의 절차다. 이 페이지는 곽상도 관련 경과를 중심으로 정리했다.</p><References ids={["gwakSeparate", "gwakAppeal"]} /></article>
      </section>

      <section className={styles.analysis} aria-labelledby="issues">
        <h2 id="issues">연표를 읽는 세 가지 기준</h2>
        <h3>공익 환수와 배임 판단은 어떻게 다른가</h3><p>이재명 측은 공공 이익을 확보한 사업이라고 설명했다. 검찰은 공사가 더 얻을 수 있었던 이익을 민간에 넘겨 손해를 끼쳤다고 주장했다. 공익이 일부 확보됐다는 설명과 사업 설계에 배임이 있었는지는 나눠 살펴야 한다.</p><References ids={["leeResponse", "trialArguments"]} />
        <h3>1심에서 모든 혐의가 같은 결론을 얻었나</h3><p>민간업자 등 5인 1심은 업무상 배임을 유죄로 판단했지만, 손해액 산정의 어려움을 이유로 특정경제범죄가중처벌법상 배임은 무죄로 봤다고 보도됐다. 전체 무죄나 검찰의 손해액 전부 인정으로 요약할 수 없다.</p><References ids={["mainVerdict", "latestTestimony"]} />
        <h3>수사 압박·조작 의혹은 어디까지 확인됐나</h3><p>2026년 청문회와 항소심에서 진술 압박과 수사 방향에 관한 주장이 나왔다. 수사 검사 측의 반박과 유동규의 반박도 함께 기록했다. 진술이 존재한다는 사실과 조작이 사법적으로 입증됐다는 결론은 다르다.</p><References ids={["hearing", "latestTestimony"]} />
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <h2 id="timeline-title">진행 타임라인</h2>
        <p>사건별로 골라 읽거나 사업 시작부터 전체 흐름을 따라갈 수 있습니다. 사건 발생일과 후속 보도일을 나눠 표시했습니다.</p>
        <form className={styles.filters} action={`/topics/${DAEJANGDONG_TOPIC.id}#timeline-title`} method="get">
          <label>사건 구분<select name="track" defaultValue={track ?? ""}><option value="">전체 사건</option>{caseTracks.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>기록 종류<select name="category" defaultValue={category ?? ""}><option value="">전체 기록</option>{timelineCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>읽는 순서<select name="order" defaultValue={newest ? "newest" : "oldest"}><option value="oldest">처음부터</option><option value="newest">최근부터</option></select></label>
          <button type="submit">적용</button>
        </form>
        <p className={styles.meta}>{entries.length}개 항목 표시</p>
        {!entries.length && <p>선택한 조건에 해당하는 기록이 없습니다. 사건 또는 기록 종류를 ‘전체’로 바꿔 보세요.</p>}
        <nav className={styles.periodNav} aria-label="시기별 바로가기">{periods.filter((period) => entries.some((entry) => entry.period === period.id)).map((period) => <a key={period.id} href={`#period-${period.id}`}>{period.range}</a>)}</nav>
        {periods.map((period) => {
          const items = entries.filter((entry) => entry.period === period.id);
          if (!items.length) return null;
          if (newest) items.reverse();
          return <section key={period.id} className={styles.period} aria-labelledby={`period-${period.id}`}>
            <div className={styles.periodHead}><span>{period.range}</span><h3 id={`period-${period.id}`}>{period.title}</h3><p>{period.description}</p></div>
            <ol className={styles.timeline}>{items.map((entry) => <li key={entry.id} id={entry.id}>
              <article className={styles.entry}>
                <div className={styles.entryMeta}><time dateTime={entry.date}>{entry.dateLabel}</time><span className={styles.badge}>{entry.category}</span></div>
                <p className={styles.meta}>{entry.track}</p>
                <h4><a href={`#${entry.id}`}>{entry.title}</a></h4>
                <p>{entry.body}</p><p className={styles.limit}><strong>확인 범위</strong> {entry.limit}</p><References ids={entry.sources} />
              </article>
            </li>)}</ol>
          </section>;
        })}
      </section>

      <section className={styles.voicesSection} aria-labelledby="related-people">
        <h2 id="related-people">관련 인물과 당시 입장</h2>
        <p>사업 참여자와 수사·재판 당사자, 공개 발언자를 함께 정리했습니다. 역할과 입장은 해당 시점 기준이며, 요약문은 직접 인용문이 아닙니다.</p>
        <div className={styles.voicesGrid}>{relatedVoices.map((voice) => <details className={styles.voice} key={voice.name}>
          <summary><span className={styles.voiceHeading}><strong>{voice.name}</strong><span className={styles.badge}>{voice.stance}</span></span><span className={styles.meta}>{voice.role} · {voice.dateLabel}</span></summary>
          <p>{voice.summary}</p><p className={styles.limit}><strong>확인 범위</strong> {voice.limit}</p><References ids={voice.sources} />
        </details>)}</div>
      </section>

      <section className={styles.method} aria-labelledby="method">
        <h2 id="method">자료와 조사 범위</h2>
        <p>공개 보도의 본문 또는 검색 색인을 대조해 작성했습니다. 자료 목록에 확인 수준을 표시했습니다. 판결문·공판조서·조사 녹취 전체와 사업 정산 원자료는 확보하지 못했습니다. 같은 진술을 전하는 여러 기사를 독립된 증거 여러 개로 세지 않습니다.</p>
        <p>위례·백현동·성남FC와 선거법 사건은 대장동과 함께 언급되더라도 별개의 혐의와 재판입니다. 50억 클럽 전체 인물의 경과와 모든 개별 공판을 수록한 것은 아닙니다. 2026년 10월 4일까지 검색했지만 각 사건의 최신 확정판결을 전부 확보한 것은 아닙니다. 자료가 없다는 사실을 새 절차가 없었다는 결론으로 바꾸지 않습니다.</p>
        <details><summary>자료 {sourceIds.length}개와 확인 수준 보기</summary><ol className={styles.sourceList}>{sourceIds.map((id) => {
          const source = researchSources[id];
          return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.publisher} · {source.publishedAt} · {source.access}</p></li>;
        })}</ol></details>
      </section>
    </main>
  </>;
}
