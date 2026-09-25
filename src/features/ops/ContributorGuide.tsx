import styles from "./ops-content.module.css";

// What a good submission looks like, in the order a contributor meets the
// form. The same rules operators follow (docs/roadmap.md 콘텐츠 등록 원칙).
export function ContributorGuide() {
  return <details className={styles.guide}>
    <summary>등록 가이드 — 처음이라면 먼저 읽어 주세요</summary>
    <div>
      <section>
        <h3>1. 출처</h3>
        <ul>
          <li>방송사·언론사가 올린 영상이나 기사를 먼저 찾습니다. 편집 채널 영상밖에 없으면 그 채널을 출처로 적고, 원 방송을 알면 맥락에 적습니다.</li>
          <li>유튜브는 언행·시선 폼 맨 위 &lsquo;유튜브 링크로 시작&rsquo;에 주소만 넣으면 출처가 만들어집니다.</li>
          <li>근거 구간은 발언이 나오는 부분만 남기세요(예: 01:03–01:16). 영상 전체는 근거가 아닙니다.</li>
        </ul>
      </section>
      <section>
        <h3>2. 원문과 요약</h3>
        <ul>
          <li><b>원문</b>은 들린 그대로 옮깁니다. 줄이면 &lsquo;…&rsquo;, 알아듣기 어려우면 &lsquo;[불명확]&rsquo;으로 표시합니다. 방송사 설명란에 받아쓰기가 있으면 그것을 씁니다.</li>
          <li><b>요약</b>은 한 줄로, 사실만 적습니다. &lsquo;망언&rsquo;, &lsquo;궤변&rsquo; 같은 평가하는 말은 쓰지 않습니다.</li>
          <li><b>시선</b>의 요약은 평가한 사람이 주어입니다. &lsquo;OOO는 △△가 …라고 말했다&rsquo;처럼 원문 범위를 넘지 않게 씁니다.</li>
        </ul>
      </section>
      <section>
        <h3>3. 화자와 날짜</h3>
        <ul>
          <li>여러 사람이 나오는 대담에서는 누가 말했는지 영상으로 꼭 확인합니다. 확실하지 않으면 &lsquo;화자 확인&rsquo;을 켜지 마세요.</li>
          <li>발언한 날을 모르고 영상 게시일로 대신했다면 날짜 확실성을 &lsquo;추정&rsquo;으로 둡니다.</li>
        </ul>
      </section>
      <section>
        <h3>4. 쓰지 않는 것</h3>
        <ul>
          <li>인물 소개에 계파나 진영 표현(&lsquo;친명&rsquo;, &lsquo;반명&rsquo; 등)을 쓰지 않습니다. 직함과 활동만 적습니다.</li>
          <li>확인되지 않은 제3자에 대한 의혹, 사생활, 공인이 아닌 사람의 기록은 등록하지 않습니다.</li>
          <li>관계는 원문에 나온 이름으로 자동으로 이어집니다. 직접 연결할 수 없습니다.</li>
        </ul>
      </section>
      <section>
        <h3>5. 검토와 공개</h3>
        <ul>
          <li>&lsquo;검토 요청&rsquo;으로 저장하면 운영자가 확인한 뒤 공개합니다. 공개되면 블록체인에 기록의 지문이 남아, 그 뒤로는 운영자만 고칠 수 있습니다.</li>
          <li>반려되면 사유가 편집기 위에 보입니다. 고친 뒤 다시 &lsquo;검토 요청&rsquo;으로 저장하세요.</li>
        </ul>
      </section>
    </div>
  </details>;
}
