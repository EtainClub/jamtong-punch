import styles from "./hub.module.css";

// How games turn into records, in plain words. The ledger keeps one stance per
// person or statement per day; replaying replaces it instead of adding.
export function PlayRules() {
  return <section className={styles.rules} aria-labelledby="rules-title">
    <h2 id="rules-title">기록은 이렇게 남습니다</h2>
    <ul>
      <li><b>게임 한 판 = 그 대상에 대한 오늘의 입장 1건.</b> 유시민 펀치 게임을 하면 &lsquo;오늘 유시민: 펀치&rsquo; 1건이 남습니다.</li>
      <li><b>같은 대상은 하루 1건.</b> 오늘 같은 사람으로 다시 하면 새로 쌓이지 않고 마지막 입장으로 바뀝니다. 내일 하면 내일의 1건이 따로 남습니다.</li>
      <li><b>대상이 다르면 따로.</b> 유시민 펀치 후 한동훈 응원을 하면 2건입니다. 카드 훑어보기는 넘긴 카드마다 1건입니다.</li>
      <li><b>점수는 무게가 없습니다.</b> 100번을 치든, 인물 페이지의 펀치 버튼을 한 번 누르든 똑같은 1건입니다. 게임 화면과 점수는 나만 봅니다.</li>
      <li><b>월드컵은 입장이 아닙니다.</b> 누구를 골랐는지는 비교 기록으로만 남고 펀치·응원 수치에 들어가지 않습니다.</li>
    </ul>
  </section>;
}
