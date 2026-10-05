import type { Metadata } from "next";
import Link from "next/link";
import { KIM_JI_YONG_TOPIC, issueChecks, relatedVoices, researchSources, timelineCategories, timelineEntries, timelinePeriods, type ResearchSourceId } from "@/content/kim-ji-yong-timeline";
import { SiteHeader } from "@/features/archive/components";
import archive from "@/features/archive/archive.module.css";
import { shareMetadata } from "@/lib/site";
import styles from "../kim-bu-seon-scandal/timeline.module.css";

export const metadata: Metadata = shareMetadata(KIM_JI_YONG_TOPIC.title, KIM_JI_YONG_TOPIC.description, `/topics/${KIM_JI_YONG_TOPIC.id}`);
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function References({ ids }: { ids: readonly ResearchSourceId[] }) {
  return <ul className={styles.references} aria-label="근거 자료">{ids.map((id) => {
    const source = researchSources[id];
    return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt}<span className={archive.visuallyHidden}> · {source.title} (새 창)</span> ↗</a></li>;
  })}</ul>;
}

export default async function KimJiYongTimelinePage({ searchParams }: Props) {
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
        <p className={archive.eyebrow}>쟁점 조사 · 검찰개혁 / 인선 / 반대 / 검증</p>
        <h1>{KIM_JI_YONG_TOPIC.title}</h1>
        <p>{KIM_JI_YONG_TOPIC.description}</p>
        <p className={styles.meta}>조사 기준 {KIM_JI_YONG_TOPIC.reviewedAt} · 연표 {timelineEntries.length}개 항목 · 관련 인물·단체 {relatedVoices.length}개 · 자료 {sourceIds.length}개</p>
        <nav className={styles.periodNav} aria-label="내용 바로가기"><a href="#president-position">대통령 X 글</a><a href="#related-voices">반대 인사와 과거 행적</a><a href="#issue-checks">쟁점별 검증</a><a href="#timeline-title">타임라인</a></nav>
      </section>

      <section className={styles.overview} aria-labelledby="current-status">
        <h2 id="current-status">현재 단계와 논쟁의 핵심</h2>
        <article><h3>임명 반대 논쟁 · 아직 후보자 검증 단계</h3><p>9월 7일 임명 제청, 10월 1일 인사청문요청안 재가가 확인된다. 중수청은 10월 2일 출범했으나 김지용 최종 임명과는 다른 절차다. 대통령은 청문회 이후 최종 결정하겠다고 밝혔다. 10월 5일 보도에서도 김지용은 후보자로 표시된다.</p><References ids={["nomination", "hearing", "presidentOct2", "imOct5"]} /></article>
        <article><h3>출신 논쟁과 구체적 행적 검증이 함께 존재</h3><p>대통령은 검사 출신 전체를 배제할 수 없다고 설명한다. 반대 인사들은 2020년 성명, 정진웅·이광철 기소, 2022년 직접 보완수사 입장과 과거 감찰 문제를 제기한다. 반대 근거를 모두 출신 문제로 축약하거나 모두 결탁의 증거로 단정하면 실제 논쟁이 사라진다.</p><References ids={["presidentX", "chuOct2", "oppositionResponse", "imOct5"]} /></article>
        <article><h3>영상의 주장도 다른 자료와 대조</h3><p>기준 영상은 인선을 옹호하는 시각에서 반대 근거를 분석한다. 그중 최은순의 모해위증 재수사와 실형을 연결한 설명은 사건 결과와 맞지 않는다. 배우자 보호를 위한 반대라는 추정도 공개된 경력 사실과 분리했다.</p><References ids={["video", "choiFinal", "choiForgery", "spouseClosure"]} /></article>
      </section>

      <section className={styles.analysis} aria-labelledby="president-position">
        <h2 id="president-position">이재명 대통령의 X 글 · 주요 근거</h2>
        <p className={styles.meta}>사용자가 지정한 글 · 2026년 10월 1일 01:20:18, 한국 시간 · 아래는 직접 인용이 아닌 요약입니다.</p>
        <h3>개혁 목표 · 분리와 독립, 수사 기능 유지</h3><p>대통령은 수사와 기소를 분리하고 정치적 독립을 보장하는 것이 개혁의 목적이라고 설명했다. 검찰에 대한 보복이나 기능의 소멸을 목표로 삼아서는 안 되며, 수사 전문성을 갖춘 전직 검사도 활용해야 한다는 입장이다.</p>
        <h3>출신만으로 배제할 수 없다는 판단</h3><p>박은정·임은정·이성윤도 검사 경력이 있다는 점을 들어 검사 출신 전체 배제론에 반박했다. 이는 구체적인 사건 행적에 대한 반대 근거가 모두 해소됐다는 것과는 다른 논점이다.</p>
        <h3>추천위와 장관 제청 · 추가 검증 결과</h3><p>공개 추천과 추천위의 후보 4명 선정, 행안부 장관 제청을 거친 절차를 설명했다. 친윤이라는 등의 반대 주장에 추가 검증을 진행해 상당 부분 사실과 다르다고 판단했다는 내용도 담겼다. 그 판단의 세부 근거 문서는 이번 조사에서 확보하지 못했다.</p>
        <h3>최종 결정과 다른 후보 재제청 가능성</h3><p>대통령은 다른 추천 후보로 바꿀 사유가 충분한지는 계속 판단해야 할 문제로 남겼다. 이후 청문회를 거쳐 결정하겠다고 밝혔으므로, 이 글을 최종 임명을 확정한 선언으로 읽지 않는다.</p>
        <References ids={["presidentX", "presidentReport", "nomination", "presidentOct2"]} />
        <p className={styles.limit}><strong>원문 확인 수준</strong> X 원 페이지는 접근이 제한돼 공식 공유 데이터로 계정·작성 시각·글 앞부분을 확인하고, 장문은 공개 재현본과 보도 내용을 대조했습니다. 추가 검증 자료가 공개돼 독립적으로 모두 확인된 상태는 아닙니다.</p>
      </section>

      <section className={styles.voicesSection} aria-labelledby="related-voices">
        <h2 id="related-voices">반대 인사들의 과거 행적과 관련성</h2>
        <p>당시 직책과 현재 입장을 나눠 살폈습니다. 접힌 항목을 열면 과거 행적, 이번 인선과의 관련성, 확인하지 못한 내용을 함께 볼 수 있습니다. 요약은 직접 인용문이 아닙니다.</p>
        <div className={styles.voicesGrid}>{relatedVoices.map((voice) => <details className={styles.voice} key={voice.name}>
          <summary><span className={styles.voiceHeading}><strong>{voice.name}</strong><span className={styles.badge}>{voice.stance}</span></span><span className={styles.meta}>{voice.role}</span></summary>
          <p><strong>과거 행적</strong><br />{voice.history}</p><p><strong>이번 논쟁과의 관련성</strong><br />{voice.connection}</p>
          <p className={styles.limit}><strong>확인 범위</strong> {voice.limit}</p><References ids={voice.sources} />
        </details>)}</div>
      </section>

      <section className={styles.overview} aria-labelledby="issue-checks">
        <h2 id="issue-checks">쟁점별 검증 · 어디까지 확인됐나</h2>
        {issueChecks.map((issue) => <article key={issue.title}><h3>{issue.title}</h3><p>{issue.finding}</p><p className={styles.limit}><strong>더 확인할 내용</strong> {issue.remaining}</p><References ids={issue.sources} /></article>)}
      </section>

      <section className={styles.video} aria-labelledby="reference-video">
        <h2 id="reference-video">기준 영상 · 주장별로 다시 보기</h2>
        <p>열린공감TV · 정천수 진행 · 2026년 10월 2일 방송. 공개 자동자막의 인명 오인식은 보도로 대조했습니다. 아래 링크는 검증 대상이 등장하는 구간입니다.</p>
        <ul className={styles.sourceList}>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=530s" target="_blank" rel="noreferrer">08:50 · 2020년 검사장 성명의 성격 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=686s" target="_blank" rel="noreferrer">11:26 · 정진웅 기소 의견과 책임 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=857s" target="_blank" rel="noreferrer">14:17 · 김학의 사건과 형사부장 재직 시기 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=1035s" target="_blank" rel="noreferrer">17:15 · 한동훈 포렌식 업무 분장 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=1175s" target="_blank" rel="noreferrer">19:35 · 보완수사 권한에 관한 평가 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=1397s" target="_blank" rel="noreferrer">23:17 · 최은순 사건 결과 연결 · 별도 사건과 대조 필요 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=1585s" target="_blank" rel="noreferrer">26:25 이후 · 배우자 경력·수임과 반대 동기에 대한 추정 ↗</a></li>
          <li><a href="https://www.youtube.com/watch?v=1D7O-LDJrIM&t=2282s" target="_blank" rel="noreferrer">38:02 · 청문회에서 확인해야 할 기록 ↗</a></li>
        </ul>
        <p className={styles.limit}><strong>영상과 대조 결과</strong> 모해위증 재수사로 최은순이 징역 1년을 받았다는 설명은 별도 잔고증명 위조 사건을 혼합합니다. 이종근의 대검 형사부장 재직은 문재인 정부 때입니다. 배우자 보호라는 동기는 추정이며, 브이글로벌 수임 의혹의 입건 전 종결 보도도 함께 고려해야 합니다.</p>
        <References ids={["video", "choiFinal", "choiForgery", "promotion", "spouseClosure"]} />
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <h2 id="timeline-title">진행 타임라인</h2><p>사건 발생 시점과 후속 보도 날짜를 구분했습니다. 날짜를 특정할 수 없는 경력은 월 단위로 표시했습니다. 같은 날 항목의 나열 순서는 실제 발언 순서를 뜻하지 않습니다.</p>
        <form className={styles.filters} action={`/topics/${KIM_JI_YONG_TOPIC.id}#timeline-title`} method="get">
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
              <div className={styles.entryMeta}><span>{entry.dateLabel}</span><span className={styles.badge}>{entry.category}</span></div>
              <h4><a href={`#${entry.id}`}>{entry.title}</a></h4><p>{entry.body}</p><p className={styles.limit}><strong>확인 범위</strong> {entry.limit}</p><References ids={entry.sources} />
            </article></li>)}</ol>
          </section>;
        })}
      </section>

      <section className={styles.method} aria-labelledby="method">
        <h2 id="method">자료와 조사 범위</h2>
        <p>2026년 10월 5일까지 공개 자료를 조사했습니다. 정부 제청 브리핑, 2020년 성명 전문, 김용민 인터뷰 전문, 제공 영상의 공개 자동자막, 대통령 글의 공유 데이터·재현본과 언론 보도를 대조했습니다. 정부·후보자 해명, 반대자의 주장, 판결·처분 보도, 진행자의 해석을 구분했습니다.</p>
        <p>정진웅·이광철 기소 의견의 회의록·결재 기록, 한동훈 포렌식 관련 지시 문서, 2018년 감찰 민원 원문과 정보공개 결정문, 인사의 실제 결정 사유는 확보하지 못했습니다. 법원 결과는 보도로 확인한 범위이며 원 결정문은 추가 확인 대상입니다. 반대자 사이의 사전 공동 기획이나 배우자 보호 목적을 입증한 연락·지시 자료도 확보하지 못했습니다.</p>
        <p>유시민의 검찰개혁 구상 비판은 관련 논평으로 기록하되 김지용 개인의 특정 행적에 대한 반대로 바꾸지 않았습니다. 김어준의 이름도 기준 영상에서 언급되지만 이번 인선에 관한 당사자의 구체적 발언 원문을 확인하지 못해 반대 인물로 확정 등록하지 않았습니다. 새로운 원문과 청문회 기록이 확보되면 날짜·근거를 붙여 보강할 수 있습니다.</p>
        <details><summary>자료 {sourceIds.length}개와 확인 수준 보기</summary><ol className={styles.sourceList}>{sourceIds.map((id) => {
          const source = researchSources[id];
          return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.publisher} · {source.publishedAt} · {source.access}</p></li>;
        })}</ol></details>
      </section>
    </main>
  </>;
}
