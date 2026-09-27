import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/features/archive/components";
import archive from "@/features/archive/archive.module.css";
import { CHAPTERS } from "@/features/guide/chapters";
import { GuideTour } from "@/features/guide/GuideTour";
import styles from "@/features/guide/guide.module.css";
import { listPeople, listTopics } from "@/lib/archive/read";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = shareMetadata("임통 둘러보기", "처음 온 사람을 위한 임통 사용 안내. 기록 카드 읽는 법, 인물·쟁점·게임·검색, 믿어도 되는 이유.");

const COMPARE_TOPIC = "government-assessment";

export default async function GuidePage() {
  const [people, topics] = await Promise.all([listPeople(), listTopics()]);
  const statements = people.reduce((sum, person) => sum + person.counts.statements, 0);
  const evaluations = people.reduce((sum, person) => sum + person.counts.evaluationsReceived, 0);
  const busiest = [...people].sort((left, right) => right.counts.statements - left.counts.statements)[0];
  const compareTopic = topics.find((topic) => topic.id === COMPARE_TOPIC) ?? topics[0];

  return <>
    <SiteHeader />
    <main className={archive.shell}>
      <section className={archive.hero}>
        <p className={archive.eyebrow}>둘러보기</p>
        <h1>처음 오셨나요</h1>
        <p>임통은 정치인과 공인이 <b>한 말</b>을 원자료와 함께 모아 두는 곳입니다. 누가 옳은지 대신 정해 주지 않습니다. 대신 누가 언제 무엇을 말했는지, 화면의 카드마다 눌러서 확인할 수 있게 만들었습니다.</p>
        <ul className={styles.stats}>
          <li><b>{people.length}</b><span>인물</span></li>
          <li><b>{statements}</b><span>언행</span></li>
          <li><b>{evaluations}</b><span>시선</span></li>
          <li><b>{topics.length}</b><span>쟁점</span></li>
        </ul>
      </section>

      <div className={styles.guide}>
        <section aria-labelledby="tour-title">
          <h2 id="tour-title">그림으로 먼저 보기</h2>
          <p className={styles.lead}>세 장이면 임통이 어떻게 생겼는지 다 나옵니다. 화살표를 누르면 그림에서 한 곳씩 밝아지고, 무엇인지는 그 아래 글로 적힙니다.</p>
          <GuideTour />
          <details className={styles.readAll}>
            <summary>글로 읽기</summary>
            {CHAPTERS.map((chapter, index) => <div key={chapter.key}>
              <h3>0{index + 1} {chapter.label} · {chapter.title}</h3>
              <ol>{chapter.steps.map((step) => <li key={step.part}>{step.text}</li>)}</ol>
            </div>)}
          </details>
        </section>

        <section aria-labelledby="try-title">
          <h2 id="try-title">먼저 하나 해보세요</h2>
          <p className={styles.lead}>설명을 읽는 것보다 한 번 눌러 보는 쪽이 빠릅니다. 셋 중 아무거나 하나면 됩니다.</p>
          <ul className={styles.tryList}>
            {busiest && <li><Link href={`/people/${busiest.id}`}>
              <em>열어 봅니다</em><strong>{busiest.name}</strong>
              <p>한 사람의 말이 연도별로 쌓여 있습니다. 카드의 출처를 누르면 영상의 그 구간이 재생됩니다.</p>
              <span>인물 페이지 →</span>
            </Link></li>}
            {compareTopic && <li><Link href={`/topics/${compareTopic.id}?view=compare`}>
              <em>나란히 봅니다</em><strong>#{compareTopic.name}</strong>
              <p>같은 쟁점에 두 사람이 한 말을 좌우로 놓습니다. 이름 칸에서 비교할 사람을 바꿉니다.</p>
              <span>나란히 비교 →</span>
            </Link></li>}
            <li><Link href="/play">
              <em>눌러 봅니다</em><strong>펀치 · 응원</strong>
              <p>인물 얼굴이 뜨면 펀치나 응원을 날립니다. 한 판이 오늘의 입장 1건이 됩니다.</p>
              <span>게임 고르기 →</span>
            </Link></li>
          </ul>
        </section>

        <section aria-labelledby="doors-title">
          <h2 id="doors-title">네 갈래로 들어갑니다</h2>
          <p className={styles.lead}>화면 아래(PC에서는 위) 네 메뉴가 네 가지 질문에 하나씩 답합니다.</p>
          <ul className={styles.doors}>
            <li><Link href="/people">
              <q>이 사람은 무슨 말을 해 왔나</q><strong>인물 <small>{people.length}명</small></strong>
              <p>본인이 한 말(언행), 남이 그를 두고 한 말(시선), 말로 이어진 사람(관계)을 한곳에 둡니다.</p>
            </Link></li>
            <li><Link href="/topics">
              <q>같은 문제에 누가 뭐라 했나</q><strong>쟁점 <small>{topics.length}개</small></strong>
              <p>하나의 쟁점을 인물별, 두 사람 나란히, 시간순 세 가지로 봅니다.</p>
            </Link></li>
            <li><Link href="/play">
              <q>나는 이 사람을 어떻게 보나</q><strong>게임 <small>3종</small></strong>
              <p>반사 게임, 카드 넘기기, 월드컵. 가볍게 즐기면서 내 입장을 남깁니다.</p>
            </Link></li>
            <li><Link href="/search">
              <q>그 말, 누가 했더라</q><strong>검색</strong>
              <p>인물 이름뿐 아니라 요약, 원문, 맥락, 쟁점까지 한 번에 찾습니다.</p>
            </Link></li>
          </ul>
        </section>

        <section aria-labelledby="anatomy-title">
          <h2 id="anatomy-title">인물 페이지는 이렇게 생겼습니다</h2>
          <p className={styles.lead}>누구를 열어도 순서가 같습니다. 한 번만 익히면 됩니다.</p>
          <ol className={styles.anatomy}>
            <li><span><b>프로필과 참여</b>지금 맡은 일, 기록·평가·관계 수, 최근 30일 펀치·응원 비율과 게임 버튼.</span></li>
            <li><span><b>발언으로 이어진 사람</b>말로 가장 많이 이어진 다섯 명. 누르면 두 사람 사이의 기록만 모아 봅니다.</span></li>
            <li><span><b>연도별 기록</b>언행과 받은 평가가 해마다 얼마나 되는지 막대로 봅니다. 막대를 누르면 그해로 갑니다.</span></li>
            <li><span><b>기록 탭</b>본인이 한 말을 최신순으로. 본인의 언행과, 본인이 다른 사람을 두고 한 평가가 함께 있습니다. 쟁점으로 거르거나, 같은 쟁점의 말을 시간순으로 모아 볼 수 있습니다.</span></li>
            <li><span><b>시선 탭</b>다른 사람들이 이 인물을 평가한 말. 이름이 스쳐 지나간 언급은 넣지 않습니다. 반론이 있으면 그 아래에 붙습니다.</span></li>
            <li><span><b>관계 탭</b>누가 누구를 언급하고 평가했는지 관계도로 봅니다.</span></li>
          </ol>
        </section>

        <section aria-labelledby="actions-title">
          <h2 id="actions-title">화면에서 할 수 있는 것</h2>
          <dl className={styles.actions}>
            <div><dt>구간 재생</dt><dd>카드의 ▶ 출처를 누르면 영상이 그 말을 한 대목부터 재생됩니다.</dd></div>
            <div><dt>그 후 실제로는</dt><dd>주장이나 예측 아래에 그 뒤 실제로 어떻게 됐는지가 공식 통계·기관 자료로 붙습니다. 말과 사실을 나란히 놓을 뿐, 맞았다·틀렸다고 적지 않습니다. 대통령 본인의 약속과 예측에도 똑같이 붙입니다.</dd></div>
            <div><dt>쟁점 보기 바꾸기</dt><dd>쟁점 페이지 위쪽의 인물별 · 나란히 비교 · 시간순으로 같은 기록을 다르게 읽습니다.</dd></div>
            <div><dt>공유</dt><dd>기록마다, 월드컵 결과마다 링크가 따로 있습니다. 받은 사람은 같은 화면을 봅니다. 게임 화면을 캡처해 올리기 전에는 <a href="#caution">주의할 점</a>을 읽어 주세요.</dd></div>
            <div><dt>신고 · 정정 요청</dt><dd>틀린 기록, 빠진 맥락, 사진 문제를 카드와 인물 페이지의 버튼으로 알려 주세요. 운영자가 확인해 고칩니다.</dd></div>
            <div><dt>기록 등록하기</dt><dd>구글 계정으로 로그인하면 누구나 언행과 시선을 등록할 수 있습니다. 유튜브 링크 하나로 초안이 만들어지고, 운영자가 확인한 뒤 공개됩니다. 인물 사진을 올리기 전에는 <a href="#caution">주의할 점</a>을 꼭 확인해 주세요.</dd></div>
            <div><dt>앱처럼 쓰기</dt><dd>브라우저 메뉴의 &lsquo;홈 화면에 추가&rsquo;나 &lsquo;앱 설치&rsquo;로 설치하면 앱처럼 열립니다. 새 버전이 나오면 화면 아래에 알려 줍니다.</dd></div>
          </dl>
        </section>

        <section id="caution" className={styles.caution} aria-labelledby="caution-title">
          <h2 id="caution-title"><span aria-hidden="true">⚠️</span> 주의할 점</h2>
          <p className={styles.lead}>아래 행동은 저작권·초상권 침해, 모욕, 명예훼손 같은 법적 문제로 이어질 수 있습니다. 책임은 올리거나 퍼뜨린 사람에게 돌아갈 수 있으니 꼭 읽어 주세요.</p>
          <ol className={styles.cautionList}>
            <li>
              <b>권리가 확인되지 않은 인물 사진을 올리지 마세요.</b>
              <p>인터넷에서 찾은 사진이라도 대부분 찍은 사람이나 언론사에 저작권이 있고, 찍힌 사람에게는 초상권이 있습니다. 검색 결과, 기사, 방송 화면, SNS에서 내려받은 사진을 허락 없이 올리면 저작권 침해가 될 수 있습니다.</p>
              <ul>
                <li>올려도 되는 사진: 위키미디어 공용의 자유 이용 사진(CC BY, CC BY-SA 등), 공공누리 제1유형처럼 누구나 쓸 수 있다고 밝힌 사진, 직접 찍었거나 허락을 받은 사진.</li>
                <li>올릴 때는 사진이 있던 곳의 주소와 저작자, 라이선스를 함께 적어 주세요. 출처 표시는 자유 이용 사진을 쓰는 조건입니다.</li>
                <li>권리를 확인할 수 없으면 올리지 말고 비워 두세요. 사진이 없어도 기록은 등록됩니다.</li>
              </ul>
            </li>
            <li>
              <b>게임에서 인물 얼굴에 펀치를 날리는 화면을 캡처해 퍼뜨리지 마세요.</b>
              <p>게임은 임통 안에서 입장을 남기는 놀이입니다. 실제 인물의 얼굴에 주먹이 날아드는 장면을 캡처하거나 녹화해 SNS·커뮤니티에 올리면, 그 사람을 모욕하거나 초상권을 침해한 것으로 문제가 될 수 있습니다. 조롱하는 글이나 확인되지 않은 주장을 덧붙이면 위험이 더 커집니다.</p>
              <ul>
                <li>공유하고 싶다면 게임 화면 대신 기록 링크나 월드컵 결과 링크를 쓰세요. 이 링크의 미리보기에는 얼굴이 들어가지 않습니다.</li>
                <li>펀치·응원 비율은 임통 참여자의 기록일 뿐 여론조사가 아닙니다. 여론인 것처럼 퍼뜨리지 마세요.</li>
              </ul>
            </li>
            <li>
              <b>원자료 없는 말, 확인되지 않은 의혹을 기록으로 올리지 마세요.</b>
              <p>기록은 방송·기사·영상 같은 원자료로 확인되는 말만 받습니다. 사실이 아닌 내용이나 확인되지 않은 의혹을 사실처럼 올리면 명예훼손이 될 수 있습니다.</p>
            </li>
          </ol>
          <p className={styles.small}>문제가 되는 사진이나 기록을 보면 카드와 인물 페이지의 &lsquo;신고·정정 요청&rsquo;으로 알려 주세요. 운영자가 확인해 내리거나 바꿉니다. 이 안내는 법률 자문이 아닙니다.</p>
        </section>

        <section aria-labelledby="trust-title">
          <h2 id="trust-title">믿어도 되는지</h2>
          <ul className={styles.trust}>
            <li><b>출처 없는 기록은 없습니다.</b>모든 카드는 방송·기사·영상 같은 원자료로 끝나고, 인용한 구간의 원문을 함께 보관합니다.</li>
            <li><b>임통은 판정하지 않습니다.</b>요약의 주어는 언제나 말한 사람입니다. 입장이 바뀌었다거나 누가 옳다고 적지 않습니다. &lsquo;그 후 실제로는&rsquo;도 판정 없이 공식 자료의 사실만 적습니다.</li>
            <li><b>공개 전에 사람이 확인합니다.</b>새 기록은 &lsquo;검토 대기&rsquo;로 들어오고 운영자가 원자료와 대조한 뒤 공개합니다.</li>
            <li><b>나중에 몰래 고칠 수 없습니다.</b>공개된 기록의 지문은 블록체인에 남아, 누구나 지금 화면과 대조할 수 있습니다.</li>
            <li><b>참여 수치는 여론조사가 아닙니다.</b>임통에 온 사람들의 기록이고, 한 사람이 한 대상에 하루 1건만 남깁니다.</li>
          </ul>
          <div className={styles.links}>
            <Link href="/about">기록 원칙 전문 읽기 →</Link>
            <Link href="/about#privacy">개인정보처리방침 →</Link>
          </div>
        </section>

        <section className={styles.start} aria-labelledby="start-title">
          <h2 id="start-title">이제 시작하기</h2>
          <p>인물 · 쟁점 · 게임 · 검색 메뉴는 어느 화면에서든 따라다닙니다. 길을 잃으면 왼쪽 위 임통 로고를 누르세요.</p>
          <Link href="/">홈으로 가기 →</Link>
        </section>
      </div>
    </main>
  </>;
}
