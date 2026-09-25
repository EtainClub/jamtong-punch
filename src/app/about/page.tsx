import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/features/archive/components";
import { MyData } from "@/features/archive/MyData";
import styles from "@/features/archive/archive.module.css";
import { shareMetadata } from "@/lib/site";

export const metadata: Metadata = shareMetadata("임통 소개와 개인정보처리방침", "임통의 기록 원칙, 참여 수치의 의미, 개인정보처리방침과 내 기록 삭제.");

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const EFFECTIVE = "2026년 9월 26일";

export default function AboutPage() {
  return <>
    <SiteHeader />
    <main className={`${styles.shell} ${styles.about}`}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>임통 소개</p>
        <h1>사람의 말과 관계를<br />기록으로 봅니다.</h1>
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
          <li><b>참여가 30명이 되어야 비율을 보여 줍니다.</b> 그보다 적으면 비율은 우연에 크게 흔들립니다.</li>
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
