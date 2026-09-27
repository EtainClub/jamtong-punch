import type { Metadata } from "next";
import Link from "next/link";
import { currentRole, SiteHeader } from "@/features/archive/components";
import { MyData } from "@/features/archive/MyData";
import styles from "@/features/archive/archive.module.css";
import { archiveLedger, listPeople } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { MIN_PARTICIPANTS } from "@/lib/stats/present";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = shareMetadata("임통 소개와 개인정보처리방침", "임통의 기록 원칙, 참여 수치의 의미, 개인정보처리방침과 내 기록 삭제.");

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const EFFECTIVE = "2026년 9월 26일";

const KIND_PATH = { statement: "statements", evaluation: "evaluations", outcome: "verify/outcome" } as const;

export default async function AboutPage() {
  const [people, ledger] = await Promise.all([listPeople(), archiveLedger()]);
  const tally = [...people]
    .map((person) => ({ person, said: person.counts.statements + person.counts.evaluationsGiven, received: person.counts.evaluationsReceived }))
    .sort((left, right) => right.said + right.received - (left.said + left.received) || left.person.name.localeCompare(right.person.name, "ko"));
  return <>
    <SiteHeader />
    <main className={`${styles.shell} ${styles.about}`}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>임통 소개</p>
        <h1>사람의 말과 관계를<br />기록으로 봅니다.</h1>
      </section>

      <section aria-labelledby="operator">
        <h2 id="operator">누가 만드나요</h2>
        <p>임통은 잼통(<a href="https://jamtong.kr" target="_blank" rel="noreferrer">jamtong.kr</a>)을 만든 운영자가 함께 만들고 운영합니다. 잼통은 이재명 정부의 업적을 그래픽과 쇼츠로 알리는 앱입니다.</p>
        <p>임통은 그와 달리 편을 들지 않는 기록 앱으로 만들었습니다. 비판이든 지지든 같은 기준으로 싣고, 운영자의 판단 대신 원문과 출처, 그 뒤의 공식 자료를 보여 줍니다. 이 약속이 지켜지는지는 아래 기록 현황과 정정 이력으로 직접 확인할 수 있습니다.</p>
      </section>

      <section aria-labelledby="criteria">
        <h2 id="criteria">무엇을 기록하나요</h2>
        <ul>
          <li><b>공인의 공개 발언만.</b> 정치인, 언론인, 방송·유튜브 진행자처럼 공적으로 말하는 사람이 방송·기사·SNS·연설에서 공개적으로 한 말입니다. 사적인 대화나 가족, 일반인은 기록하지 않습니다.</li>
          <li><b>원자료로 확인되는 말만.</b> 영상은 해당 구간을, 기사는 직접 인용을 근거로 답니다. 원자료가 없는 말은 올리지 않습니다.</li>
          <li><b>진영과 관계없이 같은 기준.</b> 누구에게 유리한지 따지지 않고 같은 규칙으로 받습니다. 임통은 사람을 계파나 진영으로 나누지 않습니다.</li>
          <li><b>확인되지 않은 의혹은 싣지 않습니다.</b> 제3자에 대한 확인되지 않은 의혹 제기, 폭력적 표현, 모욕만 있는 말은 기록하지 않습니다.</li>
          <li><b>그 뒤의 결과는 공식 자료로만.</b> &lsquo;그 후 실제로는&rsquo;은 공공기관 통계와 보도로 확인된 사실만 적고, 말이 맞았는지 틀렸는지는 적지 않습니다.</li>
          <li><b>누구나 등록할 수 있지만 운영자가 확인한 뒤 공개합니다.</b></li>
        </ul>
      </section>

      <section aria-labelledby="tally">
        <h2 id="tally">기록 현황</h2>
        <p>공개된 인물 {people.length}명 · 언행 {ledger.statements}건 · 평가 {ledger.evaluations}건 · 그 후 결과 {ledger.outcomes}건. 진영별로 나누는 대신 인물마다 기록 수를 그대로 공개합니다. 치우침이 있는지 직접 판단해 보세요.</p>
        <table className={styles.ledger}>
          <thead><tr><th>인물</th><th>직접 한 말</th><th>받은 평가</th></tr></thead>
          <tbody>{tally.map(({ person, said, received }) => <tr key={person.id}>
            <td><Link href={`/people/${person.id}`}>{person.name}</Link><small>{currentRole(person)}</small></td>
            <td>{said}</td>
            <td>{received}</td>
          </tr>)}</tbody>
        </table>
        <p className={styles.small}>직접 한 말 = 본인 언행 + 본인이 남을 두고 한 평가.</p>
      </section>

      <section aria-labelledby="corrections">
        <h2 id="corrections">정정과 내린 기록</h2>
        <p>공개한 기록을 고치면 그 내용을 기록에 남기고, 블록체인에도 새 버전을 남깁니다. 내리거나 다른 형식으로 옮긴 기록(예: 남을 평가한 언행을 &lsquo;평가&rsquo;로 옮긴 경우)은 {ledger.archived}건이며, 블록체인에는 &lsquo;내림&rsquo; 표시가 남습니다.</p>
        {ledger.corrections.length
          ? <ul>{ledger.corrections.map((item, index) => <li key={index}>{formatShortDate(item.at)} · <Link href={`/${KIND_PATH[item.kind]}/${item.id}`}>{item.label}</Link> — {item.note}</li>)}</ul>
          : <p>아직 정정한 기록이 없습니다.</p>}
      </section>
      <section aria-labelledby="records">
        <h2 id="records">기록 원칙</h2>
        <ul>
          <li><b>모든 기록은 원자료로 끝납니다.</b> 언행과 시선에는 방송·기사·영상의 출처와 구간이 붙습니다. 영상이 사라져도 확인할 수 있게 해당 구간의 원문을 함께 보관합니다.</li>
          <li><b>관계는 말에서만 생깁니다.</b> 누가 누구를 언급했는지, 누가 누구를 평가했는지로만 관계가 이어집니다. 운영자가 관계에 이름을 붙이거나 사람을 계파로 분류하지 않습니다.</li>
          <li><b>공개된 기록은 블록체인과 대조할 수 있습니다.</b> 공개할 때 기록의 지문(해시)을 Steem 블록체인(@ppebak)에 남깁니다. 각 기록의 &lsquo;⛓ 블록체인 대조&rsquo;에서 지금 화면이 그때와 같은지 직접 확인할 수 있습니다. 개인정보는 올리지 않습니다.</li>
          <li><b>사용자가 등록한 기록은 운영자가 확인한 뒤 공개합니다.</b> 공개된 기록에는 &lsquo;등록: 닉네임&rsquo;이 붙습니다.</li>
          <li><b>틀린 기록은 고칩니다.</b> 각 기록과 인물 페이지의 &lsquo;신고·정정 요청&rsquo;으로 알려 주세요. 기록된 본인의 요청은 먼저 확인합니다.</li>
        </ul>
      </section>

      <section aria-labelledby="numbers">
        <h2 id="numbers">참여 수치의 의미</h2>
        <ul>
          <li><b>여론조사가 아닙니다.</b> 펀치·응원 비율은 임통에 와서 참여한 사람들의 기록입니다. 표본을 뽑은 조사가 아니고, 일반 국민의 의견을 대표하지 않습니다.</li>
          <li><b>한 사람, 한 대상, 하루 1건.</b> 게임을 몇 번 하든, 버튼을 몇 번 누르든 같은 대상에 대한 오늘의 입장은 1건입니다. 게임 점수는 수치에 영향이 없습니다.</li>
          <li><b>참여가 {MIN_PARTICIPANTS}명이 되어야 비율을 보여 줍니다.</b> 그보다 적으면 비율은 우연에 크게 흔들립니다. {MIN_PARTICIPANTS}명을 넘어도 참여자가 적을 때의 비율은 한두 사람의 선택으로 크게 바뀔 수 있으니, 참여 수와 함께 보세요.</li>
          <li><b>선거 기간 등에는 수치를 숨길 수 있습니다.</b> 이때도 입장은 기록되고, 화면에만 나오지 않습니다.</li>
          <li><b>월드컵은 입장이 아닙니다.</b> 비교 결과는 나만 보는 기록이고, 임통은 이것으로 인물 순위를 공개하지 않습니다.</li>
        </ul>
      </section>

      <section aria-labelledby="privacy">
        <h2 id="privacy">개인정보처리방침</h2>
        <p className={styles.small}>시행일: {EFFECTIVE}</p>
        <h3>1. 처리하는 정보와 목적</h3>
        <ul>
          <li><b>모든 방문자:</b> 익명 식별자(Firebase 익명 계정), 펀치·응원 입장과 그 날짜·게임 종류·게임 점수, 월드컵 비교 결과. 참여 수치를 계산하고, 한 사람이 같은 대상에 하루 1건만 남기게 하는 데 씁니다.</li>
          <li><b>남용 방지:</b> IP 주소를 그대로 저장하지 않고 한 방향으로 변환한 값(해시)을 씁니다. 짧은 시간에 계정을 새로 만들어 수치를 흔드는 것을 막는 데만 씁니다.</li>
          <li><b>구글 계정으로 로그인한 경우:</b> 구글 계정의 이메일·이름·프로필 사진(로그인 서비스가 보관하며 화면에 공개하지 않음), 직접 정한 닉네임, 등록한 기록과 그 수정 이력. 등록자를 확인하고 공개 기록에 닉네임을 표시하는 데 씁니다.</li>
          <li><b>신고·정정 요청:</b> 요청 내용과 근거 링크. 기록을 고치거나 내리는 데 씁니다.</li>
          <li><b>방문 통계:</b> 어디서 왔는지(검색·카카오톡·공유 링크 등), 처음 온 방문인지, 첫 방문에서 두 번째 기록까지 봤는지를 날짜별 합계로만 셉니다. 계정·IP·기기 식별자는 받지 않으며, 브라우저에는 &lsquo;방문한 적 있음&rsquo; 표시만 남깁니다.</li>
          <li><b>이 브라우저에만:</b> 효과음 설정 같은 화면 설정과 로그인 상태는 브라우저 저장소에 두며 서버로 보내지 않습니다.</li>
        </ul>
        <h3>2. 보관 기간</h3>
        <ul>
          <li>입장 기록과 계정 정보: 삭제를 요청할 때까지</li>
          <li>IP 해시: 7일 · 게임 세션과 일일 한도 기록: 30일</li>
          <li>삭제한 입장은 원장에서 지워지고, 참여 수치는 개인을 알아볼 수 없는 합계로만 남아 다음 재집계 때 그 입장이 빠집니다.</li>
          <li>공개된 기록(언행·시선)은 아카이브이므로 계정을 삭제해도 남고, 등록자 표시는 &lsquo;탈퇴한 기여자&rsquo;로 바뀝니다. 블록체인에는 기록의 지문만 있어 개인정보가 없습니다.</li>
        </ul>
        <h3>3. 처리를 맡기는 곳과 국외 이전</h3>
        <ul>
          <li><b>Google LLC</b>: Firebase(로그인, 데이터 저장, 파일 저장, 웹 서버), reCAPTCHA Enterprise(자동 접속 차단). 데이터는 Google Cloud 서울 리전에, 웹 서버는 대만 리전에서 처리되며, 로그인 정보는 Google의 전 세계 인프라에 보관됩니다.</li>
          <li><b>YouTube</b>: 영상을 재생할 때만 youtube-nocookie.com에서 영상을 불러옵니다.</li>
          <li>이 밖의 제3자에게 개인정보를 제공하지 않습니다.</li>
        </ul>
        <h3>4. 이용자의 권리와 삭제</h3>
        <p>언제든지 내 입장 기록을 지우거나 계정을 삭제할 수 있습니다. 삭제는 바로 처리되고 되돌릴 수 없습니다.</p>
        <MyData />
        <h3>5. 만 14세 미만</h3>
        <p>만 14세 미만은 구글 계정 로그인과 기록 등록을 이용할 수 없습니다.</p>
        <h3>6. 문의</h3>
        <p>{CONTACT ? <>개인정보와 기록에 관한 문의: <a href={`mailto:${CONTACT}`}>{CONTACT}</a></> : <>개인정보와 기록에 관한 문의는 각 기록·인물 페이지의 &lsquo;신고·정정 요청&rsquo;으로 보내 주세요.</>}</p>
      </section>

      <p className={styles.more}><Link href="/">임통 홈으로 →</Link></p>
    </main>
  </>;
}
