import type { Metadata } from "next";
import Link from "next/link";
import { PROSECUTION_REFORM_TOPIC, issueChecks, reformStrategies, researchSources, timelineCategories, timelineEntries, timelinePeriods, type ResearchSourceId } from "@/content/prosecution-reform-timeline";
import { SiteHeader } from "@/features/archive/components";
import archive from "@/features/archive/archive.module.css";
import { shareMetadata } from "@/lib/site";
import styles from "../kim-bu-seon-scandal/timeline.module.css";

export const metadata: Metadata = shareMetadata(PROSECUTION_REFORM_TOPIC.title, PROSECUTION_REFORM_TOPIC.description, `/topics/${PROSECUTION_REFORM_TOPIC.id}`);
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function References({ ids }: { ids: readonly ResearchSourceId[] }) {
  return <ul className={styles.references} aria-label="근거 자료">{ids.map((id) => {
    const source = researchSources[id];
    return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt}<span className={archive.visuallyHidden}> · {source.title} (새 창)</span> ↗</a></li>;
  })}</ul>;
}

export default async function ProsecutionReformTimelinePage({ searchParams }: Props) {
  const query = await searchParams;
  const category = timelineCategories.find((item) => item === query.category);
  const newest = query.order === "newest";
  const entries = timelineEntries.filter((entry) => !category || entry.category === category).sort((a, b) => a.date.localeCompare(b.date));
  const periods = newest ? [...timelinePeriods].reverse() : timelinePeriods;
  const sourceIds = Object.keys(researchSources) as ResearchSourceId[];

  return <>
    <SiteHeader current="topics" />
    <main className={archive.shell}>
      <section className={archive.hero}>
        <Link className={styles.back} href="/topics">← 쟁점 목록</Link>
        <p className={archive.eyebrow}>2017~2026 · 저서·공약·발언·정부 실행</p>
        <h1>{PROSECUTION_REFORM_TOPIC.title}</h1>
        <p>{PROSECUTION_REFORM_TOPIC.description}</p>
        <p className={styles.meta}>조사 기준 {PROSECUTION_REFORM_TOPIC.reviewedAt} · 연표 {timelineEntries.length}개 항목 · 주요 쟁점 {issueChecks.length}개 · 자료 {sourceIds.length}개</p>
        <nav className={styles.periodNav} aria-label="내용 바로가기"><a href="#reform-strategy">개혁 의지와 전략</a><a href="#book-2017">2017년 저서</a><a href="#current-status">현재 단계</a><a href="#issue-checks">주요 쟁점</a><a href="#timeline-title">타임라인</a><Link href="/topics/prosecution-reform">검찰개혁 인물별 언행</Link><Link href="/topics/kim-ji-yong">김지용 인선 논쟁</Link></nav>
      </section>

      <section className={styles.voicesSection} aria-labelledby="reform-strategy">
        <h2 id="reform-strategy">기록에서 확인되는 개혁 의지와 전략</h2>
        <p>대통령 취임 전부터 이어진 구상과 취임 뒤의 실행을 함께 읽습니다. 아래는 저서·공약·공개 발언을 대조한 요약입니다. 각 시기의 근거와 구체적 변화는 연표에서 확인할 수 있습니다.</p>
        <div className={styles.voicesGrid}>{reformStrategies.map((strategy) => <article key={strategy.title} className={styles.voice}><h3>{strategy.title}</h3><p>{strategy.body}</p><p className={styles.limit}>{strategy.limit}</p><References ids={strategy.sources} /></article>)}</div>
      </section>

      <section className={styles.analysis} aria-labelledby="book-2017">
        <h2 id="book-2017">2017년 저서 · 개혁 구상의 출발점</h2>
        <p>『이재명, 대한민국 혁명하라』의 「검찰 개혁 적폐의 심장 검찰을 정조준하다」 장으로 제공된 내용은 권한 분산, 독립적 인사, 시민의 직접 통제, 저항을 감당할 지도자의 의지를 함께 제시합니다. 검·경 견제와 상설 고위공직자 수사기구도 구상에 포함됩니다.</p>
        <p className={styles.meta}>장 내용은 사용자가 제공한 텍스트를 요약했습니다. 연결한 도서관 자료는 책의 서지이며 장 원문이 아닙니다. 초판 쪽수와 문구의 동일성은 대조하지 못했습니다. 연표의 날짜는 집필일 대신 확인된 출간 시점을 사용합니다.</p>
        <References ids={["book2017", "bookPublication", "pledge2017"]} />
      </section>

      <section className={styles.overview} aria-labelledby="current-status">
        <h2 id="current-status">현재 단계 · 2026년 10월 5일 기준</h2>
        <article><h3>10월 2일, 새로운 기관 체계 가동</h3><p>검찰청이 폐지되고 공소청과 중수청으로 기능이 나뉘었습니다. 3월 설치법 제정, 8월 형사소송법 개정, 9월 후속 정비를 거쳐 시행됐습니다. 제도 시행과 실제 개혁 효과는 이어서 확인할 과제입니다.</p><References ids={["prosecutionOriginal", "criminalAmendment", "launch"]} /></article>
        <article><h3>중대범죄 수사 → 중수청 · 기소·공소유지 → 공소청</h3><p>행안부 소속 중수청이 법률이 정한 중대범죄를 수사하고 법무부 소속 공소청이 공소를 담당합니다. 경찰·공수처 등 다른 수사기관도 존재합니다. 공소청 검사의 영장 청구와 보완수사요구·시정조치 등 통제 권한은 남습니다.</p><References ids={["blueprint", "criminalLaw", "launch"]} /></article>
        <article><h3>정원 2,874명 · 약 1,900명으로 업무 시작</h3><p>중수청 출범 인력은 정원의 약 66.1%입니다. 전종민 차장의 청장 직무대행 체제로 출범했고, 김지용 후보자의 최종 임명은 별도 절차입니다. 충원·전산 준비와 사건 처리의 연속성이 운영 검증의 핵심입니다.</p><References ids={["launch", "staffing", "hearing"]} /></article>
      </section>

      <section className={styles.overview} aria-labelledby="issue-checks">
        <h2 id="issue-checks">주요 쟁점 · 확정된 변화와 남은 과제</h2>
        {issueChecks.map((issue) => <article key={issue.title}><span className={styles.badge}>{issue.status}</span><h3>{issue.title}</h3><p>{issue.finding}</p><p className={styles.limit}><strong>확인할 과제</strong> {issue.remaining}</p><References ids={issue.sources} /></article>)}
      </section>

      <section className={styles.video} aria-labelledby="starting-reference">
        <h2 id="starting-reference">참고 자료와 후속 확인</h2>
        <p>제공된 잠통 위키의 9월 19일 기준 설명을 출발점으로 삼았습니다. 법령·정부 발표와 출범 보도를 대조해 10월 2일 이후의 상태를 반영하고, 희망신청·최종 지원·실제 출범 인원을 구분했습니다.</p>
        <References ids={["reference", "launch"]} />
        <p><Link href="/topics/prosecution-reform">검찰개혁에 관한 인물들의 언행 모음 →</Link><br /><Link href="/topics/kim-ji-yong">김지용 인선에 관한 반대·해명과 과거 행적 검증 →</Link></p>
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <h2 id="timeline-title">진행 타임라인</h2><p>저서·대선 공약·공개 발언부터 정책 발표·국회 의결·공포·시행까지 이어집니다. 보도일과 사건 발생일이 다르면 날짜에 함께 적었습니다. 같은 날의 나열은 실제 발표 순서를 뜻하지 않습니다.</p>
        <form className={styles.filters} action={`/topics/${PROSECUTION_REFORM_TOPIC.id}#timeline-title`} method="get">
          <label>기록 종류<select name="category" defaultValue={category ?? ""}><option value="">전체</option>{timelineCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>읽는 순서<select name="order" defaultValue={newest ? "newest" : "oldest"}><option value="oldest">처음부터</option><option value="newest">최근부터</option></select></label><button type="submit">적용</button>
        </form>
        <p className={styles.meta}>{entries.length}개 항목 표시</p>
        <nav className={styles.periodNav} aria-label="시기별 바로가기">{periods.filter((period) => entries.some((entry) => entry.period === period.id)).map((period) => <a key={period.id} href={`#period-${period.id}`}>{period.range}</a>)}</nav>
        {periods.map((period) => {
          const items = entries.filter((entry) => entry.period === period.id);
          if (!items.length) return null;
          if (newest) items.reverse();
          return <section key={period.id} className={styles.period} aria-labelledby={`period-${period.id}`}>
            <div className={styles.periodHead}><span>{period.range}</span><h3 id={`period-${period.id}`}>{period.title}</h3><p>{period.description}</p></div>
            <ol className={styles.timeline}>{items.map((entry) => <li key={entry.id} id={entry.id}><article className={styles.entry}>
              <div className={styles.entryMeta}><time dateTime={entry.date}>{entry.dateLabel}</time><span className={styles.badge}>{entry.category}</span></div>
              <h4><a href={`#${entry.id}`}>{entry.title}</a></h4><p>{entry.body}</p><p className={styles.limit}><strong>확인 범위</strong> {entry.limit}</p><References ids={entry.sources} />
            </article></li>)}</ol>
          </section>;
        })}
      </section>

      <section className={styles.method} aria-labelledby="method">
        <h2 id="method">자료와 조사 범위</h2>
        <p>2017년 책은 사용자 제공 내용과 별도로 확인한 출간 정보·당시 공약 보도를 구분했습니다. 이후 이재명의 직접 발언·공약과 대표 재임 중 민주당의 추진안을 구분하고, 초기 제안·검토 의견·최종 시행 제도도 나눠 표시했습니다. 전략 요약은 공개 기록에 근거한 해석입니다.</p>
        <p>2026년 10월 5일까지 확인한 공개 자료를 정리했습니다. 법령의 공포·시행 정보와 공개 조문, 정부 보도자료, 국회 처리와 준비 상황 보도를 대조했습니다. 정부가 제시한 목적, 당사자의 평가, 확인된 절차와 운영 실적을 구분했습니다. 본문의 설명은 직접 인용문이 아닌 요약입니다.</p>
        <p>형사소송법 일부 조항은 2027년 이후 단계적으로 시행되므로 10월 2일에 모든 후속 규정이 시행됐다고 표시하지 않습니다. 9월 29일 개정본도 함께 연결했습니다. 실제 사건 처리 지연·전산 장애·권한 남용의 규모와 원인은 이번 자료만으로 확정하지 않습니다.</p>
        <p>대통령 X 원 페이지는 접근이 제한돼 공유 데이터와 공개 재현본·보도를 대조했습니다. 인선 추가 검증의 세부 자료는 확보하지 못했습니다. 출처별로 본문·검색 공개 내용·법령 확인 범위를 아래에 표시했습니다.</p>
        <References ids={["criminalSchedule", "prosecutionCurrent", "investigationCurrent"]} />
        <details><summary>자료 {sourceIds.length}개와 확인 수준 보기</summary><ol className={styles.sourceList}>{sourceIds.map((id) => {
          const source = researchSources[id];
          return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.publisher} · {source.publishedAt} · {source.access}</p></li>;
        })}</ol></details>
      </section>
    </main>
  </>;
}
