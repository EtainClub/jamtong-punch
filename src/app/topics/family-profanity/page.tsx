import type { Metadata } from "next";
import Link from "next/link";
import { FAMILY_PROFANITY_TOPIC, relatedVoices, researchSources, timelineCategories, timelineEntries, timelinePeriods, type ResearchSourceId } from "@/content/family-profanity-timeline";
import { SiteHeader } from "@/features/archive/components";
import archive from "@/features/archive/archive.module.css";
import { shareMetadata } from "@/lib/site";
import styles from "../kim-bu-seon-scandal/timeline.module.css";

export const metadata: Metadata = shareMetadata(FAMILY_PROFANITY_TOPIC.title, FAMILY_PROFANITY_TOPIC.description, `/topics/${FAMILY_PROFANITY_TOPIC.id}`);
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function References({ ids }: { ids: readonly ResearchSourceId[] }) {
  return <ul className={styles.references} aria-label="근거 자료">{ids.map((id) => {
    const source = researchSources[id];
    return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt}<span className={archive.visuallyHidden}> · {source.title} (새 창)</span> ↗</a></li>;
  })}</ul>;
}

export default async function FamilyProfanityTimelinePage({ searchParams }: Props) {
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
        <p className={archive.eyebrow}>쟁점 조사 · 갈등 / 녹취 / 해명 / 판결</p>
        <h1>{FAMILY_PROFANITY_TOPIC.title}</h1>
        <p>{FAMILY_PROFANITY_TOPIC.description}</p>
        <p className={styles.meta}>조사 기준 {FAMILY_PROFANITY_TOPIC.reviewedAt} · 연표 {timelineEntries.length}개 항목 · 관련 인물 {relatedVoices.length}명 · 자료 {sourceIds.length}개</p>
      </section>

      <section className={styles.overview} aria-labelledby="current-status">
        <h2 id="current-status">먼저 확인할 사실</h2>
        <article><h3>욕설 사실 · 본인의 인정과 사과</h3><p>이재명은 2021년 가족에게 폭언한 사실을 인정했다. 2022년 녹음파일 재공개와 2025년 대선 토론에서도 사과했다. 욕설의 존재와 당시 갈등의 원인에 관한 설명은 나눠 살펴야 한다.</p><References ids={["apology2021", "apology2022", "debate2025"]} /></article>
        <article><h3>갈등의 원인 · 서로 다른 설명</h3><p>이재명은 친형의 시정 개입과 어머니에 대한 언행을 배경으로 설명했다. 박인복은 남편의 시정 비판이 원인이었고 어머니 폭행 주장은 사실이 아니라고 반박했다. 통화별 날짜와 원본 전체를 확보하지 못해 어느 한 설명으로 전말을 확정하지 않는다.</p><References ids={["explanation2017", "parkConference"]} /></article>
        <article><h3>2020년 무죄 확정 · 판결의 대상</h3><p>친형 강제입원 관련 직권남용·토론회 허위사실공표 등 사건은 무죄가 확정됐다. 이는 욕설을 하지 않았다는 판결이나 모든 가족 갈등에 대한 사실 판단이 아니다.</p><References ids={["supremeCourt", "finalAcquittal"]} /></article>
        <article><h3>2023년 보도 · 녹취를 재생한 단체의 별도 재판</h3><p>녹취를 집회에서 재생한 단체 간부들은 항소심에서 일부 무죄와 감형을 받았다고 보도됐다. 공개 행위의 공익성과 사전선거운동이 쟁점인 별도 사건이며, 이재명에 대한 재판 결과와 구분한다.</p><References ids={["publicationAppeal"]} /></article>
      </section>

      <section className={styles.analysis} aria-labelledby="context">
        <h2 id="context">전말을 이해하는 쟁점</h2>
        <h3>통화 날짜와 이후 충돌을 나눠 읽기</h3><p>박인복은 통화를 6월 9일 또는 10일로 설명했다. 한편 이재명 캠프는 2018년 5월 17일, 폭언 뒤 통화와 7월 폭행 뒤 통화가 각각 있었다고 반박했다. 6월 녹취를 7월 충돌의 결과로 합쳐서는 안 되며, 모든 통화가 폭행 이전이었다고 단정해서도 안 된다. 개별 파일의 날짜와 앞뒤 내용을 대조해야 한다.</p><References ids={["parkConference", "callChronology"]} />
        <h3>‘원본’ 표시와 편집·왜곡 주장의 확인 수준</h3><p>자유한국당은 2018년 파일을 원본과 축약본으로 나눠 공개했다. 이재명은 녹취 일부가 왜곡·조작됐다고 주장했다. 보도에 붙은 원본이라는 이름만으로 무편집 여부가 입증되지는 않으며, 조작 주장도 편집 전후 파일의 대조 없이 확정할 수 없다.</p><References ids={["partyPublication", "parkConference"]} />
        <h3>공개적인 선거 활용과 조직적 조작 의혹</h3><p>정당 홈페이지 공개, 경쟁 후보와의 기자회견, 국회 녹음파일 공개, 대선 토론 재거론은 확인된다. 이런 정치적 활용의 존재가 가족 간 갈등 전체를 조직적으로 만들어냈다는 증거는 아니다. 자료의 전달·편집·공개 경위는 추가 조사 대상이다.</p><References ids={["partyPublication", "recordingRelease2022", "debate2025"]} />
      </section>

      <section className={styles.analysis} aria-labelledby="coordination">
        <h2 id="coordination">의도적 유도·공동 기획 의혹은 어디까지 확인됐나</h2>
        <h3>협박 주장과 녹음 유도 의도는 서로 다른 질문</h3><p>민주당은 2012년 5월 28일 어머니에 대한 방화 협박과 이후 폭언·폭행, 선택적 녹음 공개를 주장했다. 국민의힘은 수행비서의 협박성 연락이 먼저 있었다는 반론을 냈다. 당시 언행이 있었다는 주장과, 제3자와 협력해 화를 유발하고 녹음하려 했다는 의도는 따로 검증해야 한다.</p><References ids={["partyContext2022", "opposingContext2022"]} />
        <h3>통화 뒤 정치인 이름이 등장한다는 의혹 보도</h3><p>2022년 서울의소리 보도의 재게시본은 통화 종료 뒤 대화를 제시하며 진수희에게 전화하겠다는 대목을 공모 정황으로 해석했다. 원 기사 접근에 실패했고 원음과 법정 진술 기록도 확보하지 못했다. 이 대목이 사실이어도 실제 연락 여부와 상대방의 협력, 통화 전에 협박·폭행을 기획했는지는 추가 증거가 필요하다.</p><References ids={["coordinationReport"]} />
        <h3>국정원 접촉·사주 주장의 출처와 관련 재판</h3><p>이재명은 2016년 방송에서 국정원 직원이 형을 접촉해 간첩 의심과 퇴진운동을 부추겼다고 주장했다. 관련 보도는 주장을 전한 자료다. 별도의 논문·시정 정보 수집 손해배상 사건에서는 2017년 양측 항소가 기각됐다. 이 소송을 녹취 공동 기획을 인정한 판결로 읽을 수 없으며, 그 의혹 전체를 판단한 판결도 아니다.</p><References ids={["nisAllegation", "nisCivilAppeal"]} />
        <h3>자료 전달 경로와 사전 공동 기획의 확인 수준</h3><p>박인복은 정치인·지인·언론에 녹취를 보냈다고 설명했다. 이후 정당의 파일 공개와 경쟁 후보 기자회견도 확인된다. 현재 확보한 공개 자료에서는 통화 전에 협박·폭행·녹음을 함께 계획했다는 지시나 연락 기록을 찾지 못했다. ‘셋업’은 검토할 가설로 남기고, 사후 공개 협력을 사전 기획의 입증으로 바꾸지 않는다.</p><References ids={["familyReport", "partyPublication", "parkConference"]} />
      </section>

      <section className={styles.analysis} aria-labelledby="judgments">
        <h2 id="judgments">최종 판결을 구체적으로 읽기</h2>
        <h3>2019도13328 · 직권남용 부분은 무죄 유지</h3><p>대법원은 검사의 상고를 기각했다. 평가문건 수정과 진단·보호 신청, 경찰서 방문 등 각각의 행위가 직권남용 또는 의무 없는 일을 시킨 경우인지 나눠 판단했다. 입원 절차 진행을 지시·재촉한 사실은 인정하면서도 해당 범죄의 요건이 증명되지 않았다고 봤다. 무죄를 입원 절차에 전혀 관여하지 않았다는 뜻으로 요약하면 안 된다.</p><References ids={["judgmentText"]} />
        <h3>토론회 허위사실공표 · 다수의견과 반대의견</h3><p>다수의견은 질문·답변의 맥락과 토론의 특성을 고려해 일부 사실을 말하지 않은 답변을 적극적인 허위사실 공표로 보기 어렵다고 판단했다. 반대의견은 불리한 지시 사실을 숨긴 채 유리한 사실을 덧붙인 답변이 전체적으로 사실을 왜곡했다고 봤다. 판결문 속 토론 발언 인용을 어머니 폭행이나 녹취 공동 기획을 인정한 판단으로 읽지 않는다.</p><References ids={["judgmentText"]} />
        <h3>파기환송과 무죄 확정은 서로 다른 단계</h3><p>2020년 7월 16일 대법원은 유죄 부분을 파기환송했다. 10월 16일 수원고법이 무죄를 선고했고, 10월 23일 검찰이 재상고를 포기하면서 확정됐다. 확정된 무죄와 욕설의 인정·사과는 함께 기록한다.</p><References ids={["judgmentText", "finalAcquittal", "apology2021"]} />
        <h3>가처분·폭행 처분·공개자 재판은 별도 확인</h3><p>2012년 공개 금지 가처분과 어머니 접근금지 결정, 폭행 관련 처분은 원문을 확보하지 못했다. 2016년 금전 청구와 2023년 집회 녹취 재생 사건도 최종 확정 자료가 추가로 필요하다. 서로 다른 사건의 결과를 합쳐 ‘욕설 사건 전체가 무죄’ 또는 ‘공모가 인정됐다’고 표시하지 않는다.</p><References ids={["publicationClaim", "partyContext2022", "publicationAppeal"]} />
      </section>

      <section className={styles.voicesSection} aria-labelledby="related-voices">
        <h2 id="related-voices">관련 인물과 당시 입장</h2>
        <p>통화 당사자와 가족의 설명, 선거에서 문제를 제기한 인물과 녹취 공개자의 역할을 함께 정리했습니다. 역할은 당시 기준이며 요약은 직접 인용문이 아닙니다.</p>
        <div className={styles.voicesGrid}>{relatedVoices.map((voice) => <details className={styles.voice} key={voice.name}>
          <summary><span className={styles.voiceHeading}><strong>{voice.name}</strong><span className={styles.badge}>{voice.stance}</span></span><span className={styles.meta}>{voice.role} · {voice.dateLabel}</span></summary>
          <p>{voice.summary}</p><p className={styles.limit}><strong>확인 범위</strong> {voice.limit}</p><References ids={voice.sources} />
        </details>)}</div>
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <h2 id="timeline-title">진행 타임라인</h2>
        <p>과거 사건 시기와 후속 인터뷰·보도 날짜를 구분했습니다. 정확한 날이 확인되지 않은 기록은 연도·월·범위로 표시했습니다.</p>
        <form className={styles.filters} action={`/topics/${FAMILY_PROFANITY_TOPIC.id}#timeline-title`} method="get">
          <label>기록 종류<select name="category" defaultValue={category ?? ""}><option value="">전체</option>{timelineCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>읽는 순서<select name="order" defaultValue={newest ? "newest" : "oldest"}><option value="oldest">처음부터</option><option value="newest">최근부터</option></select></label>
          <button type="submit">적용</button>
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
              <h4><a href={`#${entry.id}`}>{entry.title}</a></h4><p>{entry.body}</p>
              <p className={styles.limit}><strong>확인 범위</strong> {entry.limit}</p><References ids={entry.sources} />
            </article></li>)}</ol>
          </section>;
        })}
      </section>

      <section className={styles.method} aria-labelledby="method">
        <h2 id="method">자료와 조사 범위</h2>
        <p>공개 보도 본문·검색 색인과 국가법령정보센터의 대법원 2019도13328 판결 전문을 대조했습니다. 개별 자료의 확인 수준은 목록에 표시했습니다. 녹음파일 전체, 최초 게시물, 가처분·접근금지 결정문, 가족 간 충돌 수사 처분 원문과 선관위 회신 원문은 확보하지 못했습니다. 공모 의혹 보도는 재게시본 확인에 그쳤으며 원음·편집 내역·해당 법정 진술을 독립 검증하지 못했습니다.</p>
        <p>2016년 금전 청구와 2022년 녹취 공개자 고발의 최종 결과, 2023년 공개 행위 재판의 확정 여부는 추가 확인 대상입니다. 관련 판결의 대상과 통화 속 언행을 구분했고, 정신건강 상태나 입원·사망의 인과관계를 추정하지 않았습니다.</p>
        <p>2026년 10월 5일까지 검색했으며, 이번 조사에서 확인한 최근 직접적인 선거 공방은 2025년 5월 27일 토론입니다. 이후 정치 평가나 옛 녹취 재업로드를 새로운 통화 사건으로 세지 않았습니다. 자료를 확보하지 못한 것이 후속 사건이 없었다는 뜻은 아닙니다.</p>
        <details><summary>자료 {sourceIds.length}개와 확인 수준 보기</summary><ol className={styles.sourceList}>{sourceIds.map((id) => {
          const source = researchSources[id];
          return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.publisher} · {source.publishedAt} · {source.access}</p></li>;
        })}</ol></details>
      </section>
    </main>
  </>;
}
