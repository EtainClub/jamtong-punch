// Editorial research, separate from attributed CMS statements and their counters.
// Dates describe the public action, not proof that an alleged encounter occurred.
export const KIM_BU_SEON_TOPIC = {
  id: "kim-bu-seon-scandal",
  title: "김부선 스캔들: 의혹 제기와 검증의 타임라인",
  description: "초기 인터뷰부터 선거에서의 재거론, 수사와 민사소송까지. 공개된 주장과 확인된 절차를 출처와 함께 살펴봅니다.",
  reviewedAt: "2026-10-04",
  latestVerifiedDevelopment: "2025-06-04",
} as const;

type ResearchSource = {
  title: string;
  publisher: string;
  publishedAt: string;
  url: string;
  access: "본문 확인" | "검색 색인 확인" | "메타데이터 확인";
};

export const researchSources = {
  gongSns: { title: "이재명 후보 ‘김부선 스캔들’에 공지영 입연 이유", publisher: "SBS연예뉴스", publishedAt: "2018-06-07", url: "https://ent.sbs.co.kr/news/article.do?article_id=E10009100320", access: "검색 색인 확인" },
  gongPress: { title: "공지영 ‘이재명-김부선 스캔들에서 김부선 지지, 후회하지 않는다’", publisher: "아시아경제", publishedAt: "2018-07-30", url: "https://view.asiae.co.kr/article/2018073015024431714?idxno=2018073015024431714&sec=ent1", access: "검색 색인 확인" },
  gongRadio: { title: "[인터뷰] 공지영 ‘관종? 그런 관심은 그만…잘 늙고싶을뿐’", publisher: "CBS 김현정의 뉴스쇼", publishedAt: "2018-07-31", url: "https://www.nocutnews.co.kr/news/5008638", access: "본문 확인" },
  pyo: { title: "김부선 ‘나는 거짓말쟁이 아니다’…이재명 저격?", publisher: "채널A", publishedAt: "2018-06-15", url: "https://ichannela.com/news/main/news_detailPage.do?publishId=000000098729", access: "본문 확인" },
  ahn: { title: "안민석 ‘주진우에게 진실 얘기하라 했다’", publisher: "서울신문", publishedAt: "2018-06-21", url: "https://m.seoul.co.kr/news/politics/2018/06/21/20180621500089", access: "검색 색인 확인" },
  partyLeadership: { title: "김진표 ‘이재명, (탈당) 결단’ vs 송영길 ‘사법처리 여부가 먼저’", publisher: "동아일보", publishedAt: "2018-07-30", url: "https://www.donga.com/news/List/article/all/20180730/91300663/2", access: "검색 색인 확인" },
  chu: { title: "추미애 ‘쓸데없는 말 많은데 경기지사는 일하는 능력 보면 돼’", publisher: "연합뉴스", publishedAt: "2018-06-10", url: "https://www.yna.co.kr/view/AKR20180610022700001", access: "검색 색인 확인" },
  partyElection: { title: "민주 ‘이재명 스캔들’에 차단막…‘예의주시’ 신중론도", publisher: "연합뉴스", publishedAt: "2018-06-11", url: "https://www.yna.co.kr/view/AKR20180611079700001", access: "검색 색인 확인" },
  choi: { title: "김부선 ‘국민여러분, 독이 든 시뻘건 사이다를 조심하세요!’", publisher: "세계일보", publishedAt: "2018-06-25", url: "https://www.segye.com/newsView/20180625000025", access: "검색 색인 확인" },
  hwang: { title: "황교익-공지영, SNS 설전…‘이재명·김부선 스캔들’ 재점화", publisher: "뉴시스", publishedAt: "2018-06-21", url: "https://www.newsis.com/view/NISX20180621_0000342150", access: "검색 색인 확인" },
  kimYongMin: { title: "김용민 ‘주진우에 이재명-김부선 스캔들 물었더니…진실 모른다가 진실’", publisher: "동아일보", publishedAt: "2018-06-11", url: "https://www.donga.com/news/article/all/20180611/90524633/2", access: "검색 색인 확인" },
  referenceShort: { title: "김용남도 이해 안 갔던 KBS 김부선 출연", publisher: "민주는 파출부 / YouTube", publishedAt: "2026-10-03", url: "https://www.youtube.com/shorts/ahmp6frEZzA", access: "메타데이터 확인" },
  initial: { title: "사과했다? 고발도 했다…11년째 이재명 옥죄는 스캔들 전말", publisher: "중앙일보", publishedAt: "2021", url: "https://www.joongang.co.kr/article/24106665", access: "검색 색인 확인" },
  sns: { title: "김영환 언급한 ‘여배우 스캔들’ 의혹, 무엇?…김부선 vs 이재명 ‘SNS 설전’ 재조명", publisher: "동아일보", publishedAt: "2018-05-30", url: "https://www.donga.com/news/Politics/article/all/20180530/90316706/1", access: "검색 색인 확인" },
  debate: { title: "가라앉지 않는 ‘이재명 여배우 스캔들’…‘주진우-김부선’ 추정 녹취파일까지?", publisher: "동아일보", publishedAt: "2018-05-31", url: "https://www.donga.com/news/Society/article/all/20180531/90332411/9", access: "검색 색인 확인" },
  denial: { title: "주진우·김부선 음성파일에 이재명 ‘정치공작…책임 묻겠다’", publisher: "세계일보", publishedAt: "2018-05-31", url: "https://www.segye.com/newsView/20180531000890", access: "검색 색인 확인" },
  conference: { title: "이재명 캠프, 김부선 스캔들 공세에 ‘이재명 힘내라’ 셀프 응원", publisher: "동아일보", publishedAt: "2018-06-07", url: "https://www.donga.com/news/Politics/article/all/20180607/90451122/2", access: "검색 색인 확인" },
  interview: { title: "김부선 KBS뉴스 인터뷰…‘거짓이면 천벌’", publisher: "CBS노컷뉴스", publishedAt: "2018-06-10", url: "https://www.nocutnews.co.kr/news/4982940", access: "본문 확인" },
  interviewYna: { title: "김부선 ‘거짓말 필요한 사람 이재명이겠나, 김부선이겠나’", publisher: "연합뉴스", publishedAt: "2018-06-11", url: "https://www.yna.co.kr/view/AKR20180611035700005", access: "검색 색인 확인" },
  mediaDispute: { title: "김부선, 이재명 겨냥? ‘불순세력이 배후라고? 헐’", publisher: "뉴시스", publishedAt: "2018-06-25", url: "https://www.newsis.com/view/NISX20180625_0000345362", access: "검색 색인 확인" },
  chronology: { title: "[일지] 이재명 지사 ‘친형 강제입원’ 등 관련 사건", publisher: "연합뉴스", publishedAt: "2018-12-11", url: "https://www.yna.co.kr/view/AKR20181211101700061", access: "검색 색인 확인" },
  witnesses: { title: "‘이재명 여배우 스캔들’ 관련 주진우 참고인 조사", publisher: "서울신문", publishedAt: "2018-07-25", url: "https://www.seoul.co.kr/news/society/2018/07/25/20180725500019", access: "검색 색인 확인" },
  joo: { title: "주진우 ‘김부선 사과문 대필’ 의혹 부인", publisher: "뉴데일리", publishedAt: "2018-07-26", url: "https://www.newdaily.co.kr/svc/article_print.html?no=2018072600007", access: "검색 색인 확인" },
  medical: { title: "‘점 없다, 뺀 흔적도 없다’…이재명 신체 검증으로 역공", publisher: "MBC", publishedAt: "2018-10-17", url: "https://imnews.imbc.com/replay/2018/nwtoday/article/4882188_30187.html", access: "검색 색인 확인" },
  prosecution: { title: "‘김부선 스캔들’ 이재명 판정승…‘사진 한장 없었다’", publisher: "연합뉴스", publishedAt: "2018-12-11", url: "https://www.yna.co.kr/view/AKR20181211160600061", access: "본문 확인" },
  decision: { title: "이재명·김부선, 무성한 스캔들에도 불기소 처분…이유는?", publisher: "SBS", publishedAt: "2018-12-14", url: "https://news.sbs.co.kr/news/endPage.do?news_id=N1005057468", access: "본문 확인" },
  criminalWithdrawal: { title: "김부선, 검찰 조사 중 이재명 ‘명예훼손’ 혐의 고소 취하", publisher: "연합뉴스", publishedAt: "2018-12-14", url: "https://www.yna.co.kr/view/AKR20181214164400061", access: "검색 색인 확인" },
  citizens: { title: "이재명 지지자 2019명 ‘여배우 스캔들은 허위사실’ 김부선·공지영 고발", publisher: "세계일보", publishedAt: "2019-01-09", url: "https://www.segye.com/newsView/20190109004234", access: "검색 색인 확인" },
  primaryDebate: { title: "이재명 ‘바지 한번 더 내릴까’…김부선 ‘조사 받자’", publisher: "동아일보", publishedAt: "2021-07-06", url: "https://www.donga.com/news/Politics/article/all/20210706/107806857/2", access: "검색 색인 확인" },
  response2021: { title: "이재명, ‘김부선의 입’에 정면대응…‘두번이나 사과해놓고’", publisher: "연합뉴스", publishedAt: "2021-07-14", url: "https://www.yna.co.kr/view/AKR20210714078300001", access: "검색 색인 확인" },
  hearing2021: { title: "김부선, 이재명 상대 손배소서 딸 증인 신청", publisher: "뉴스엔", publishedAt: "2021-08-26", url: "https://v.daum.net/v/kth5trXIDB", access: "검색 색인 확인" },
  hearing2022: { title: "‘이재명 손배소’ 김부선, 딸 증인 안 부르기로…‘점’ 두고 공방", publisher: "뉴시스 / 파이낸셜뉴스", publishedAt: "2022-01-05", url: "https://www.fnnews.com/news/202201051901085376", access: "검색 색인 확인" },
  conference2022: { title: "‘이재명 손톱에 1㎝까만 줄’…‘신체 특징’ 또 꺼낸 김부선", publisher: "동아일보", publishedAt: "2022-02-28", url: "https://www.donga.com/news/Politics/article/all/20220228/112085504/2", access: "검색 색인 확인" },
  rejectedWitness: { title: "법원, 김부선 증인 신청 기각…‘이재명 신체검증 의사 증언 뻔해’", publisher: "이투데이", publishedAt: "2022-06-23", url: "https://www.etoday.co.kr/news/view/2146748", access: "검색 색인 확인" },
  civilWithdrawal: { title: "김부선, 이재명 상대 3억 소송 취하서 제출…3년 10개월만", publisher: "뉴스핌", publishedAt: "2022-07-11", url: "https://web3.newspim.com/news/view/20220711000414", access: "검색 색인 확인" },
  civilWithdrawalSeoul: { title: "‘패자니까’ 김부선, 이재명 상대 3억 손해배상 소송 취하", publisher: "서울신문", publishedAt: "2022-07-11", url: "https://www.seoul.co.kr/news/society/2022/07/11/20220711500016", access: "검색 색인 확인" },
  yoo: { title: "유동규 ‘이재명, 김부선 집 바래다 준 적 있다 했다’", publisher: "국민일보", publishedAt: "2023-03-29", url: "https://www.kmib.co.kr/article/view.asp?arcid=0018102145", access: "검색 색인 확인" },
  comments2024: { title: "배우 김부선, 이재명 언급…‘대통령 되면 尹처럼 계엄령 때리겠냐’", publisher: "머니투데이", publishedAt: "2024-12-23", url: "https://www.mt.co.kr/society/2024/12/23/2024122314464149393", access: "검색 색인 확인" },
  debate2025: { title: "대선후보 2차 TV 토론 ‘격돌’…‘검사·총각 사칭’ 시작부터 저격", publisher: "SBS 뉴스 공식 유튜브", publishedAt: "2025-05", url: "https://www.youtube.com/watch?v=b3R1SB08wEo", access: "검색 색인 확인" },
  campaign2025: { title: "김문수 ‘김부선 펑펑 울면서 김문수 뽑겠다 하더라’", publisher: "이데일리", publishedAt: "2025-06-02", url: "https://www.edaily.co.kr/News/Read?mediaCodeNo=257&newsId=03604726642197784", access: "검색 색인 확인" },
  message2025: { title: "김부선, 이재명 대통령에 영상 메시지 ‘공정한 지도자 되어달라’", publisher: "이데일리", publishedAt: "2025-06-04", url: "https://www.edaily.co.kr/News/Read?mediaCodeNo=258&newsId=01262806642198440", access: "검색 색인 확인" },
} as const satisfies Record<string, ResearchSource>;

export type ResearchSourceId = keyof typeof researchSources;
export type TimelineCategory = "의혹·반박" | "선거·보도" | "수사·소송" | "후속 발언";
type TimelineEntry = {
  id: string;
  date: string;
  dateLabel: string;
  period: "initial" | "election2018" | "litigation" | "recent";
  category: TimelineCategory;
  title: string;
  body: string;
  limit: string;
  sources: readonly ResearchSourceId[];
};

export const timelineEntries: readonly TimelineEntry[] = [
  {
    id: "claimed-encounter", date: "2007-12-01", dateLabel: "2007~2009년 (훗날 제기된 주장)", period: "initial", category: "의혹·반박",
    title: "김부선이 나중에 주장한 만남의 시기",
    body: "김부선은 2018년 인터뷰에서 2007년 말 만났고, 상대의 기혼 사실을 알게 됐다고 주장했다. 공개 의혹의 발단인 2010년 인터뷰와 주장 속 만남의 시기는 다르다.",
    limit: "만남·교제의 성립이 확인된 연표가 아니다. 이재명은 부적절한 관계를 부인했다.", sources: ["interviewYna", "initial"],
  },
  {
    id: "first-interview", date: "2010-11-01", dateLabel: "2010.11 (후속 보도는 11일자 인터뷰로 설명)", period: "initial", category: "선거·보도",
    title: "한겨레 ‘김어준이 만난 여자’ 인터뷰로 의혹 공개",
    body: "김부선은 실명을 쓰지 않은 채 변호사 출신 정치인과의 관계를 이야기했다. 이후 온라인에서 상대를 이재명으로 추정하는 논란이 이어졌다.",
    limit: "초기 기사 원문과 전체 녹음은 이번 조사에서 직접 확보하지 못했다. 인터뷰 내용·시점은 후속 보도를 근거로 기록했다.", sources: ["initial", "debate"],
  },
  {
    id: "early-denial", date: "2010-11-30", dateLabel: "2010년 초기 보도 이후 (정확한 게시일 미확인)", period: "initial", category: "의혹·반박",
    title: "김부선의 부인과 이후 번복",
    body: "후속 보도는 김부선이 초기 논란 뒤 거론된 인물이 아니라는 취지로 부인했다고 설명한다. 김부선은 2018년에 그 부인에 주변의 설득이 있었다고 주장했다.",
    limit: "초기 부인 게시일과 원본은 미확인이다. 주변의 압박이 있었다는 설명도 김부선의 주장으로 남긴다.", sources: ["initial", "interview"],
  },
  {
    id: "child-support", date: "2013-08-01", dateLabel: "2013년 (일자 미확인)", period: "initial", category: "의혹·반박",
    title: "양육비 관련 SNS 공방에서 이재명 실명 등장",
    body: "김부선은 이재명에게 양육비 등 법률 문제의 도움을 약속받았으나 이행되지 않았다는 취지로 글을 올렸다. 후속 보도는 이를 2014년 지방선거 약 열 달 전의 글로 설명한다.",
    limit: "법률 상담에 관한 비판을 교제 사실의 증거로 바꿔 읽지 않는다. 원 게시물의 정확한 일자는 미확인이다.", sources: ["initial", "sns"],
  },
  {
    id: "sns-2016", date: "2016-01-25", dateLabel: "2016.01.25~27", period: "initial", category: "의혹·반박",
    title: "‘가짜 총각’ 표현과 양육비 상담 반박",
    body: "이재명은 양육비 상담을 도왔으나 소송을 진행하지 않은 데 대한 불만이라는 취지로 반박했다. 김부선은 SNS에서 실명과 ‘가짜 총각’ 표현을 사용하며 맞섰다.",
    limit: "양측의 설명과 공개 공방이 확인되는 단계다. 당시 SNS 원문 전체를 확보한 것은 아니다.", sources: ["sns"],
  },
  {
    id: "apology-2016", date: "2016-01-27", dateLabel: "2016.01.27", period: "initial", category: "의혹·반박",
    title: "김부선, 양육비 문제 외 관계 없다는 사과문 게시",
    body: "김부선이 관계를 부인하고 사과하는 글을 올린 것으로 보도됐다. 이 사과문 작성에 주진우가 관여했는지를 둘러싼 논란이 2018년 녹취 공개로 다시 불거졌다.",
    limit: "사과문이 존재했다는 사실과 그 내용의 진실성, 작성 경위는 별개다.", sources: ["sns", "joo"],
  },
  {
    id: "debate-2018", date: "2018-05-29", dateLabel: "2018.05.29", period: "election2018", category: "선거·보도",
    title: "김영환, 경기지사 후보 TV토론에서 의혹 제기",
    body: "바른미래당 김영환 후보가 KBS 토론회에서 주진우 관련 메일과 여배우와의 만남을 물었다. 이재명은 과거 만난 사람이라는 취지로 답했으나 스캔들 의혹은 부인했다.",
    limit: "안면·접촉의 인정과 연인 관계의 인정은 다르다. 이 문답을 불륜 인정으로 요약하지 않는다.", sources: ["debate"],
  },
  {
    id: "recording-2018", date: "2018-05-31", dateLabel: "2018.05.30~31", period: "election2018", category: "의혹·반박",
    title: "사과문 관련 통화 녹취 확산, 이재명은 정치공작 의심 제기",
    body: "김부선과 주진우의 통화로 알려진 녹음이 온라인에서 확산됐다. 이재명은 주진우에게 사과문 작성을 부탁하지 않았다고 말하고, 유포 경위를 정치공작으로 의심했다.",
    limit: "‘정치공작’은 당시 이재명의 해석이다. 최초 유포자·편집 경위·지휘 관계를 이 자료만으로 확정할 수 없다.", sources: ["denial", "debate"],
  },
  {
    id: "conference-2018", date: "2018-06-07", dateLabel: "2018.06.07", period: "election2018", category: "선거·보도",
    title: "김영환 기자회견과 공지영의 전언으로 의혹 확대",
    body: "김영환은 기자회견에서 추가 의혹을 제기했다. 공지영은 주진우에게 과거 관련 이야기를 들었다는 취지의 SNS 글을 올렸다.",
    limit: "공지영의 전언은 현장을 직접 목격한 증언과 구분한다. 여럿의 발언이 같은 주장을 반복해도 독립된 증거가 늘었다고 볼 수 없다.", sources: ["conference", "gongSns"],
  },
  {
    id: "kbs-interview", date: "2018-06-10", dateLabel: "2018.06.10", period: "election2018", category: "선거·보도",
    title: "지방선거 사흘 전 KBS 뉴스9 인터뷰 방송",
    body: "김부선은 관계·사진·식사 결제 등에 관한 주장을 다시 제기했다. KBS는 당사자가 입장을 밝히기를 원해 알 권리 차원에서 인터뷰했으며, 이재명 측에도 반론을 요청했다고 설명했다.",
    limit: "김부선의 진술을 방송한 사실은 확인된다. 방송을 결정한 배후에 조직적 지시가 있었다는 증거는 확보하지 못했다.", sources: ["interview", "interviewYna"],
  },
  {
    id: "opposition-complaint", date: "2018-06-10", dateLabel: "2018.06.10", period: "election2018", category: "수사·소송",
    title: "바른미래당 측, 스캔들 부인 등을 허위사실 공표로 고발",
    body: "바른미래당 측은 스캔들과 다른 의혹에 관한 이재명의 발언을 문제 삼아 고발했다. 스캔들 부인이 선거법상 허위사실 공표인지가 수사의 쟁점이 됐다.",
    limit: "고발은 혐의 제기이며 입증이나 유죄 판결이 아니다. 다른 의혹의 재판 결과와도 구분한다.", sources: ["chronology"],
  },
  {
    id: "media-dispute", date: "2018-06-24", dateLabel: "2018.06.24~25", period: "election2018", category: "의혹·반박",
    title: "보도 방식과 배후 주장을 둘러싼 공방",
    body: "이재명은 일부 언론이 김부선의 말을 사실로 취급한다고 비판했다. 김부선은 자신의 폭로에 불순세력이 있다는 취지의 주장을 반박하고 KBS ‘저널리즘 토크쇼J’도 비판했다.",
    limit: "누가 언론을 비판했는지 확인하는 기록이다. 양측의 평가를 방송 개입의 확정 증거로 쓰지 않는다.", sources: ["mediaDispute"],
  },
  {
    id: "counter-complaint", date: "2018-06-26", dateLabel: "2018.06.26", period: "election2018", category: "수사·소송",
    title: "이재명 측, 김영환·김부선을 선거법 위반으로 고발",
    body: "이재명 측은 두 사람이 허위사실을 유포했다는 취지로 맞고발했다. 의혹 제기 측과 부인 측의 고발이 함께 수사 대상이 됐다.",
    limit: "이 고발의 공모 주장 역시 이후 검찰에서 인정하기 어렵다는 판단을 받았다.", sources: ["chronology", "prosecution"],
  },
  {
    id: "witnesses", date: "2018-07-18", dateLabel: "2018.07.18~25", period: "election2018", category: "수사·소송",
    title: "공지영·김어준·주진우 참고인 조사",
    body: "공지영은 18일, 김어준은 24일 조사받았고 주진우는 25일 출석했다. 주진우는 김부선을 도우려 했지만 사과문 대필·코치라는 설명과는 상황이 다르다고 밝혔다.",
    limit: "참고인 출석 자체는 공모·은폐·조작 가담의 인정이 아니다. 각자가 들은 이야기와 직접 확인한 사실을 나눠야 한다.", sources: ["witnesses", "joo"],
  },
  {
    id: "criminal-complaint", date: "2018-09-14", dateLabel: "2018.09.14~18", period: "election2018", category: "수사·소송",
    title: "강용석 동행 경찰 출석과 김부선의 형사 고소",
    body: "김부선은 14일 강용석 변호사와 경찰에 출석했다. 18일에는 자신에 대한 명예훼손 및 선거 토론 발언을 문제 삼아 서울남부지검에 고소했다.",
    limit: "형사 고소와 이후 3억 원의 민사 손해배상 청구는 서로 다른 절차다.", sources: ["chronology", "criminalWithdrawal"],
  },
  {
    id: "civil-claim", date: "2018-09-28", dateLabel: "2018.09.28", period: "election2018", category: "수사·소송",
    title: "김부선, 3억 원 손해배상 소송 제기",
    body: "김부선은 이재명이 자신을 허언증 환자 등으로 표현해 정신적·경제적 손해를 입었다며 서울동부지법에 민사소송을 냈다. 이후 소송은 2022년까지 이어졌다.",
    limit: "소송의 청구 원인은 명예훼손에 따른 손해배상이다. 교제 사실을 확정한 판결이 아니다.", sources: ["hearing2022", "civilWithdrawal"],
  },
  {
    id: "medical", date: "2018-10-16", dateLabel: "2018.10.16", period: "election2018", category: "수사·소송",
    title: "아주대병원 신체 검증: 주장된 점과 제거 흔적 관찰되지 않음",
    body: "김부선이 신체의 점을 언급한 녹음이 공개된 뒤 이재명이 자진 검증을 받았다. MBC는 경기도 대변인을 통해 전달된 의료진 판단을 보도했다.",
    limit: "의료진이 확인한 범위는 특정 신체 특징이다. 검증 결과를 두 사람의 모든 과거 접촉 여부에 대한 판정으로 확대하지 않는다.", sources: ["medical"],
  },
  {
    id: "police", date: "2018-11-01", dateLabel: "2018.11.01", period: "election2018", category: "수사·소송",
    title: "경찰, 스캔들 관련 의혹을 불기소 의견으로 송치",
    body: "경찰은 이재명 관련 여러 의혹 중 여배우 스캔들을 불기소 의견으로 검찰에 넘겼다. 이 시점은 경찰 의견이며 최종 검찰 처분은 다음 달에 이뤄졌다.",
    limit: "다른 혐의에 대한 기소 의견을 이 스캔들에 적용해서는 안 된다.", sources: ["chronology"],
  },
  {
    id: "prosecution", date: "2018-12-11", dateLabel: "2018.12.11", period: "election2018", category: "수사·소송",
    title: "검찰, 스캔들 부인 발언과 김부선·김영환 고발 건 모두 불기소",
    body: "검찰은 토론의 추상적 질문에 대한 즉답이 선거법상 처벌 대상이 되기 어렵고, 김부선의 주장을 뒷받침할 객관적 증거도 부족하다고 설명했다. 맞고발 건에서는 김영환의 허위 인식과 두 사람의 공모를 인정하기 어렵다고 봤다.",
    limit: "교제 사실이 입증되지 않았다는 판단과 조직적 조작이 입증됐다는 주장은 다르다. 불기소를 법원의 무죄 확정 판결로 부르지 않는다.", sources: ["prosecution"],
  },
  {
    id: "decision-details", date: "2018-12-14", dateLabel: "2018.12.14 (결정서 보도일)", period: "election2018", category: "수사·소송",
    title: "SBS, 불기소결정서의 증거 검토 내용 보도",
    body: "SBS는 식사 결제에 관한 진술 변화, 사진 미확보, 점 미발견, 만남·통화 시점 불일치가 결정서에 적혔다고 보도했다.",
    limit: "결정서 전문을 직접 열람한 것이 아니라 결정서를 입수한 SBS의 보도를 근거로 요약했다.", sources: ["decision"],
  },
  {
    id: "criminal-withdrawal", date: "2018-12-14", dateLabel: "2018년 11월 취하 / 12.14 보도", period: "election2018", category: "수사·소송",
    title: "김부선의 명예훼손 형사 고소 취하 사실 확인",
    body: "검찰은 김부선이 11월 조사 중 처벌 의사를 철회했고 명예훼손 부분을 공소권 없음으로 종결했다고 밝혔다. 선거법 부분은 별도로 수사해 12월 11일 불기소 처리했다.",
    limit: "취하의 정확한 일자는 보도에서 확인되지 않는다. 명예훼손 부분은 진실·거짓의 본안 판단으로 끝난 것이 아니다.", sources: ["criminalWithdrawal"],
  },
  {
    id: "citizens", date: "2019-01-09", dateLabel: "2019.01.09", period: "litigation", category: "수사·소송",
    title: "이재명 지지자 공익고발단, 관련 인물 네 명 고발",
    body: "2019명이 참여했다고 밝힌 공익고발단은 김부선·공지영·김영환·이창윤을 무고·명예훼손 등 혐의로 고발했다. 앞선 선거법 고발은 형식 요건 문제로 각하됐다고 보도됐다.",
    limit: "이 후속 고발의 최종 처분·판결은 이번 조사에서 확보하지 못했다. 고발단의 주장을 사법 판단으로 표시하지 않는다.", sources: ["citizens"],
  },
  {
    id: "primary-debate", date: "2021-07-05", dateLabel: "2021.07.05", period: "litigation", category: "선거·보도",
    title: "민주당 대선 경선 토론에서 다시 쟁점화",
    body: "정세균이 스캔들 해명 태도를 물었고 이재명은 ‘바지 한 번 더 내릴까요’라고 답했다. 14일에는 과거 사과와 신체 검증을 들며 반박하고 자신의 토론 표현도 사과했다.",
    limit: "신체 검증을 가리킨 발언과 표현에 대한 사과다. 관계를 인정하거나 의혹 자체를 사과한 것으로 기록하지 않는다.", sources: ["primaryDebate", "response2021"],
  },
  {
    id: "hearing-2021", date: "2021-08-25", dateLabel: "2021.08.25", period: "litigation", category: "수사·소송",
    title: "민사 3차 변론: 신체 감정 등 신청과 딸 증인 신청",
    body: "김부선 측은 신체 감정과 사실조회 등을 요청하고 딸을 증인으로 신청했다. 보도에 따르면 법원은 신체 감정 등의 적절성에 부정적인 입장을 밝혔다.",
    limit: "증인 신청과 실제 증언은 다르다. 다음 해에는 딸의 증인 신청을 철회했다.", sources: ["hearing2021", "hearing2022"],
  },
  {
    id: "hearing-2022", date: "2022-01-05", dateLabel: "2022.01.05", period: "litigation", category: "수사·소송",
    title: "딸 증인 신청 철회, 신체 검증 의료진 신청 논의",
    body: "김부선 측 장영하 변호사는 딸을 증인으로 부르지 않기로 하고 아주대병원 의료진을 신청하겠다고 밝혔다. 이재명 측은 점 논쟁이 손해배상 청구 원인과 연결되지 않는다고 반박했다.",
    limit: "이 단계는 증거 신청 공방이다. 의료진이 말을 바꾸거나 검증 결과가 뒤집힌 사실을 확인한 것이 아니다.", sources: ["hearing2022"],
  },
  {
    id: "conference-2022", date: "2022-02-28", dateLabel: "2022.02.28", period: "litigation", category: "선거·보도",
    title: "대선 아홉 날 전, 장영하와 공동 기자회견",
    body: "김부선은 이재명의 대통령 당선을 막으려 한다는 취지로 기자회견을 열고 또 다른 신체 특징을 주장했다.",
    limit: "선거에 영향을 주려는 공개 목적은 보도에서 확인된다. 주장한 신체 특징이 교제를 입증하는지, 비공개 공모가 있었는지는 별도 문제다.", sources: ["conference2022"],
  },
  {
    id: "rejected-witness", date: "2022-06-23", dateLabel: "2022.06.23", period: "litigation", category: "수사·소송",
    title: "법원, 아주대병원 의료진 증인 신청 기각",
    body: "서울동부지법 재판부는 의료진이 기존 소견과 같은 답을 할 것으로 보아 증인 신청을 받아들이지 않았다.",
    limit: "증거 신청에 대한 절차 결정이다. 이 결정 자체를 모든 스캔들 주장의 진위에 대한 판결로 부르지 않는다.", sources: ["rejectedWitness"],
  },
  {
    id: "civil-withdrawal-intent", date: "2022-07-03", dateLabel: "2022.07.03", period: "litigation", category: "의혹·반박",
    title: "소송 취하 의사와 강용석에 대한 비판",
    body: "김부선은 강용석의 설득으로 민사소송을 시작했으며 서로 정치적 사심이 있었다는 취지로 SNS에서 설명했다. 소송을 취하하겠다는 뜻도 밝혔다.",
    limit: "김부선의 사후 평가다. 이 말이 최초 의혹의 조작이나 조직적 기획을 자백한 것이라고 단정할 수 없다.", sources: ["civilWithdrawal", "civilWithdrawalSeoul"],
  },
  {
    id: "civil-withdrawal", date: "2022-07-08", dateLabel: "2022.07.08 (11일 법원 확인 보도)", period: "litigation", category: "수사·소송",
    title: "3억 원 손해배상 소송 취하서 제출",
    body: "김부선 측 대리인 장영하가 서울동부지법에 소 취하서를 냈다. 당시 보도는 이재명 측이 송달 뒤 2주 이내 이의하지 않으면 종결된다고 설명했다.",
    limit: "확인된 것은 취하서 제출이다. 최종 종결 기록은 직접 확보하지 못했다. 본안의 승소·패소나 불륜 인정 판결로 표현하지 않는다.", sources: ["civilWithdrawal"],
  },
  {
    id: "yoo-2023", date: "2023-03-26", dateLabel: "2023.03.26 (28~29일 보도)", period: "recent", category: "의혹·반박",
    title: "유동규, 이재명에게 들었다는 말을 유튜브에서 주장",
    body: "유동규는 이재명이 김부선을 집에 바래다준 적이 있다고 말했다는 취지로 발언했다. 민주당은 개인 주장이라는 입장을 밝혔다.",
    limit: "본인이 현장을 목격했다는 설명이 아닌 전언이다. 교제의 입증이나 2018년 검찰 처분의 변경으로 보지 않는다.", sources: ["yoo"],
  },
  {
    id: "comments-2024", date: "2024-12-22", dateLabel: "2024.12.22 (23일 보도)", period: "recent", category: "후속 발언",
    title: "계엄 이후 정치 평가와 관계 추측 댓글에 대한 반발",
    body: "김부선은 유튜브에서 윤석열을 비판하고 이재명과 비교했다. 자신과 이재명의 관계를 추측하는 댓글에도 반발했다고 보도됐다.",
    limit: "당시의 정치적 평가와 댓글 대응이다. 과거 관계 주장을 공식 철회했다는 내용으로 해석하지 않는다.", sources: ["comments2024"],
  },
  {
    id: "debate-2025", date: "2025-05-23", dateLabel: "2025.05.23", period: "recent", category: "선거·보도",
    title: "대선 2차 TV토론에서 ‘총각 사칭’ 표현 재등장",
    body: "김문수는 사회 분야 대선 토론에서 이재명을 공격하며 ‘총각 사칭’을 거론했다. SBS 공식 영상의 공개 설명에서 이 표현과 토론 날짜를 확인했다.",
    limit: "영상 전체 발언을 전사한 것은 아니다. 기존 의혹의 정치적 재활용이며 새로운 물증이 공개됐다는 뜻은 아니다.", sources: ["debate2025"],
  },
  {
    id: "campaign-2025", date: "2025-06-01", dateLabel: "2025.06.01 (2일 보도)", period: "recent", category: "선거·보도",
    title: "김문수, 유세에서 김부선의 지지를 언급",
    body: "김문수는 남양주 유세에서 자신의 토론 발언에 김부선이 감사하며 지지를 밝혔다고 말했다.",
    limit: "김문수가 전달한 김부선의 반응이다. 선거 공세가 있었다는 사실과 그 의혹의 진위는 구분한다.", sources: ["campaign2025"],
  },
  {
    id: "message-2025", date: "2025-06-04", dateLabel: "2025.06.04", period: "recent", category: "후속 발언",
    title: "김부선, 대통령 당선 뒤 공정한 지도자가 되라는 메시지",
    body: "김부선은 대통령이 된 이재명에게 복잡한 심경을 밝히며 차별 없이 좋은 지도자가 되어 달라고 말했다고 보도됐다.",
    limit: "당선 뒤의 메시지다. 사과·폭로 철회·관계 입증 또는 새 사법 판단으로 볼 근거는 없다.", sources: ["message2025"],
  },
  {
    id: "reference-short-2026", date: "2026-10-03", dateLabel: "2026.10.03 (YouTube 게시 정보)", period: "recent", category: "후속 발언",
    title: "KBS 김부선 출연을 문제 삼는 제목의 쇼츠 게시",
    body: "사용자가 제공한 ‘민주는 파출부’ 채널의 38초 쇼츠가 게시됐다. 제목은 ‘김용남도 이해 안 갔던 KBS 김부선 출연’이다. YouTube 공개 페이지와 oEmbed에서 게시 정보·제목·채널을 확인했다.",
    limit: "발언 내용과 원방송·촬영일은 미확인이다. 자동 자막 트랙은 표시됐지만 공개 자막 요청은 빈 응답이었다. 제목만으로 김용남의 구체적 발언이나 조직적 개입을 확정하지 않는다.", sources: ["referenceShort"],
  },
  {
    id: "chu-2018", date: "2018-06-10", dateLabel: "2018.06.10", period: "election2018", category: "선거·보도",
    title: "추미애, 의혹 공세보다 도지사 업무 능력을 강조",
    body: "당시 민주당 대표 추미애는 경기 광주 지원유세에서 사생활 공세를 비판하고 이재명 후보 지지를 호소했다.",
    limit: "후보 지원 발언이다. 김부선의 진술을 신뢰한다고 말한 것으로 분류하지 않는다.", sources: ["chu"],
  },
  {
    id: "park-2018", date: "2018-06-11", dateLabel: "2018.06.11", period: "election2018", category: "선거·보도",
    title: "박영선, 유권자의 혼란을 언급하며 선거 판세 평가",
    body: "민주당 공동선대위원장 박영선은 CBS 인터뷰에서 유권자들이 혼란스러울 수 있지만 경기지사 선거 판세가 크게 흔들리지는 않을 것으로 전망했다.",
    limit: "선거 영향에 대한 전망이며 의혹의 진위를 확인한 발언이 아니다.", sources: ["partyElection"],
  },
  {
    id: "pyo-2018", date: "2018-06-15", dateLabel: "2018.06.15 (보도일)", period: "election2018", category: "후속 발언",
    title: "표창원, 선거 뒤 구체적 해명과 윤리적 사과 요구",
    body: "표창원 민주당 의원은 선거 전에는 이재명에게 투표하자고 했지만, 선거 뒤에는 윤리적 사과와 구체적인 해명을 요구한 것으로 보도됐다.",
    limit: "해명 요구는 확인된다. 이 보도만으로 김부선의 모든 주장이 사실이라고 인정했다고 볼 수 없다.", sources: ["pyo"],
  },
  {
    id: "ahn-2018", date: "2018-06-20", dateLabel: "2018.06.20 (21일 보도)", period: "election2018", category: "후속 발언",
    title: "안민석, 주진우에게 진실을 이야기하라고 요구했다고 설명",
    body: "안민석 민주당 의원은 KBS ‘사사건건’에서 주진우에게 설명을 요구했고, 주진우는 진실을 모른다고 답했다고 전했다. 공지영과 주진우가 오해를 풀고 국민의 궁금증에 답하기를 기대한다고 말했다.",
    limit: "설명 요구와 주진우의 답변에 대한 전언이다. 안민석의 교제 사실 확인이나 김부선 지지 선언으로 요약하지 않는다.", sources: ["ahn"],
  },
  {
    id: "hwang-gong-2018", date: "2018-06-20", dateLabel: "2018.06.20~21", period: "election2018", category: "의혹·반박",
    title: "황교익과 공지영, 전언에 근거한 판단을 두고 공방",
    body: "황교익은 전해 들은 이야기로 타인의 관계를 판단하는 데 신중해야 한다고 주장했다. 공지영은 김부선이 허언증 환자처럼 취급되는 상황에서 자신이 들은 내용을 말할 필요가 있다고 반박했다.",
    limit: "발언과 전언의 신뢰도를 둘러싼 논쟁이다. SNS 원본 전체와 교제 사실을 직접 검증한 자료는 확보하지 못했다.", sources: ["hwang"],
  },
  {
    id: "party-leadership-2018", date: "2018-07-29", dateLabel: "2018.07.29~30", period: "election2018", category: "선거·보도",
    title: "민주당 당권 경쟁에서 김진표와 송영길의 대응 차이",
    body: "김진표는 당에 부담을 주는 논란을 이유로 이재명의 탈당 결단을 요구했다. 송영길은 김부선·김영환 고발과 다른 의혹 수사를 언급하며 수사 결과에 따른 당 차원의 대응을 주장했다.",
    limit: "여러 의혹이 함께 논의된 정치적 거취 문제다. 김진표의 탈당 요구를 김부선 주장 전체의 신뢰 선언으로 확대하지 않는다.", sources: ["partyLeadership"],
  },
  {
    id: "gong-support-2018", date: "2018-07-30", dateLabel: "2018.07.30~31", period: "election2018", category: "후속 발언",
    title: "공지영, 기자간담회와 CBS 인터뷰에서 김부선 옹호 재확인",
    body: "공지영은 ‘해리’ 출간 간담회에서 김부선을 옹호한 입장이 변하지 않았다고 밝혔다. 다음 날 CBS에서는 김부선이 허언증 환자로 취급되는 것을 막고 자신이 들은 이야기를 전하려 했으며, 같은 비난을 받아도 다시 돕겠다고 설명했다.",
    limit: "김부선 옹호는 명시적으로 확인된다. 주진우와의 대화에 관한 증언과 교제 현장 목격은 다르며, 은폐에 관여했다는 설명도 공지영의 주장이다.", sources: ["gongPress", "gongRadio"],
  },
];

type RelatedVoice = {
  name: string;
  role: string;
  dateLabel: string;
  stance: string;
  summary: string;
  limit: string;
  sources: readonly ResearchSourceId[];
};

// These are dated positions in this controversy, not permanent labels for people.
export const relatedVoices: readonly RelatedVoice[] = [
  { name: "공지영", role: "작가", dateLabel: "2018.06.07 · 07.30~31", stance: "김부선 옹호", summary: "주진우에게 들었다는 이야기를 공개하고, 기자간담회와 CBS 인터뷰에서 김부선을 계속 돕겠다는 입장을 밝혔다.", limit: "명시적 옹호 발언은 확인했다. 교제 현장을 목격했다는 증언은 아니다. 당시 발언을 현재의 입장으로 표시하지 않는다.", sources: ["gongSns", "gongPress", "gongRadio"] },
  { name: "김영환", role: "당시 바른미래당 경기지사 후보", dateLabel: "2018.05~06 · 12.11 수사 설명", stance: "의혹 제기 · 진술 신뢰", summary: "토론과 기자회견에서 의혹을 제기했다. 검찰은 김부선의 말을 사실로 믿고 발언한 것으로 보아 허위 인식을 인정하기 어렵다고 설명했다.", limit: "검찰의 고의·공모 판단과 교제 사실 입증은 별개다. 2018년 민주당 소속으로 표시하지 않는다.", sources: ["conference", "prosecution"] },
  { name: "표창원", role: "당시 민주당 의원", dateLabel: "2018.06.15 보도", stance: "해명·사과 요구", summary: "선거 뒤 윤리적인 부분의 사과와 명확한 해명을 요구했다.", limit: "김부선의 주장 전체를 믿는다는 직접 발언은 이 자료에서 확인되지 않는다.", sources: ["pyo"] },
  { name: "안민석", role: "당시 민주당 의원", dateLabel: "2018.06.20 방송", stance: "주진우 설명 요구", summary: "주진우에게 진실을 말하라고 요구했다고 밝히고, 주진우가 모른다고 답했다는 전언을 소개했다.", limit: "김부선 지지 선언이나 직접 목격담으로 분류하지 않는다.", sources: ["ahn"] },
  { name: "김진표", role: "당시 민주당 의원 · 당대표 후보", dateLabel: "2018.07.29", stance: "정치적 책임·탈당 요구", summary: "여러 논란으로 당에 부담을 준다는 이유로 이재명의 탈당 결단을 요구했다.", limit: "다른 의혹도 함께 논의됐다. 탈당 요구를 교제 사실 확인으로 바꾸지 않는다.", sources: ["partyLeadership"] },
  { name: "송영길", role: "당시 민주당 의원 · 당대표 후보", dateLabel: "2018.07.30", stance: "수사 결과 우선", summary: "김부선·김영환 고발과 다른 의혹을 언급하며 수사 결과를 보고 당 차원에서 대응하자는 입장을 밝혔다.", limit: "김부선의 진술을 신뢰한다고 확인한 발언이 아니다.", sources: ["partyLeadership"] },
  { name: "추미애", role: "당시 민주당 대표", dateLabel: "2018.06.10", stance: "이재명 후보 지원", summary: "사생활 공세를 비판하고 도지사는 업무 능력으로 판단하자며 이재명 지지를 호소했다.", limit: "후보 지원과 의혹의 진위 검증을 구분한다.", sources: ["chu"] },
  { name: "박영선", role: "당시 민주당 공동선대위원장", dateLabel: "2018.06.11", stance: "선거 영향 평가", summary: "유권자의 혼란을 언급하면서도 경기지사 선거 판세가 크게 흔들리지는 않을 것으로 전망했다.", limit: "김부선의 진술 신뢰 여부를 밝힌 발언으로 분류하지 않는다.", sources: ["partyElection"] },
  { name: "정세균", role: "당시 민주당 대선 경선 후보", dateLabel: "2021.07.05", stance: "해명 태도 검증", summary: "경선 토론에서 스캔들에 관한 해명 태도를 물었고 이재명이 신체 검증을 가리키는 표현으로 답했다.", limit: "질문을 했다는 사실과 의혹이 사실이라고 믿었다는 판단은 다르다.", sources: ["primaryDebate", "response2021"] },
  { name: "최욱", role: "방송인 · 당시 저널리즘 토크쇼J 출연자", dateLabel: "2018.06.24 방송 · 25일 보도", stance: "언론 비판 · 신뢰 발언 추가 확인", summary: "당선인 인터뷰에서 스캔들 질문을 한 언론의 태도를 비판한 것으로 보도됐다. 김부선은 과거 라디오 녹화에서 자신이 설명했는데 처음 듣는 듯 반응했다며 최욱을 비판했다.", limit: "김부선의 항의는 김부선의 주장이다. 별도로 김부선을 신뢰했다는 발언은 방송 원본·회차·구간을 확보하지 못했다. 해당 발언이 없었다고 결론 내리지는 않는다.", sources: ["choi", "mediaDispute"] },
  { name: "황교익", role: "맛 칼럼니스트", dateLabel: "2018.06.20~21", stance: "전언 판단에 신중론", summary: "전해 들은 이야기가 왜곡될 수 있다며 공지영의 판단과 주진우에 대한 답변 요구를 비판했다.", limit: "SNS 공방에 관한 보도다. 교제 사실의 독립적 검증으로 보지 않는다.", sources: ["hwang"] },
  { name: "김용민", role: "방송인", dateLabel: "2018.06.11", stance: "주진우의 모른다는 답변 전달", summary: "자신이 물었을 때 주진우가 진실을 모른다고 답했다고 전했다.", limit: "공지영의 전언과 서로 다른 해석이 있음을 기록한다. 주진우의 인식이나 관계의 진위를 확정하지 않는다.", sources: ["kimYongMin"] },
  { name: "주진우", role: "기자", dateLabel: "2018.07.25~26", stance: "사과문 대필 의혹 반박", summary: "참고인 조사에 출석하며 김부선을 돕고자 했지만 대필·코치라는 설명과 상황이 다르다고 밝혔다.", limit: "공지영·안민석·김용민의 전언과 본인의 공개 설명을 구분한다.", sources: ["witnesses", "joo"] },
  { name: "김어준", role: "방송인 · 초기 인터뷰 진행자", dateLabel: "2010년 인터뷰 · 2018.07.24 조사", stance: "인터뷰·참고인 조사", summary: "초기 인터뷰 진행과 후속 참고인 조사로 관련됐다.", limit: "이번 조사에서는 김부선 신뢰를 선언한 직접 발언을 확보하지 못했다. 인터뷰 게재 자체를 신뢰 선언으로 세지 않는다.", sources: ["initial", "witnesses"] },
  { name: "유동규", role: "전 경기관광공사 사장", dateLabel: "2023.03.26 주장 · 29일 보도", stance: "새 전언 제기", summary: "이재명이 김부선을 집에 바래다준 적이 있다고 자신에게 말했다는 취지로 주장했다.", limit: "현장 목격이나 교제 사실 입증과 구분한다.", sources: ["yoo"] },
  { name: "강용석", role: "당시 김부선 법률대리인", dateLabel: "2018.09 · 2022.07 후속 설명", stance: "법률 조력 · 정치적 목적 공방", summary: "경찰 조사와 소송에 김부선의 대리인으로 참여했다. 김부선은 소송 취하 의사를 밝히며 강용석의 설득과 서로의 정치적 사심을 언급했다.", limit: "후속 설명은 김부선의 평가다. 변호인 선임이나 정치적 목적에서 의혹의 진위를 자동으로 판단하지 않는다.", sources: ["prosecution", "civilWithdrawalSeoul"] },
  { name: "장영하", role: "당시 김부선 소송대리인", dateLabel: "2022.01.05 · 02.28 · 07.08", stance: "증거 신청 · 기자회견·취하 대리", summary: "민사소송에서 의료진 증인 신청을 논의하고 김부선과 기자회견에 참여했다. 7월에는 소 취하서를 제출했다.", limit: "대리인의 절차 참여와 교제 사실에 대한 독립적인 증언은 다르다.", sources: ["hearing2022", "conference2022", "civilWithdrawal"] },
  { name: "김문수", role: "당시 국민의힘 대선 후보", dateLabel: "2025.05.23 · 06.01", stance: "대선 공세 · 김부선 반응 전달", summary: "대선 토론에서 총각 사칭을 거론했고, 유세에서는 김부선이 자신의 발언에 감사하며 지지를 밝혔다고 말했다.", limit: "기존 의혹의 선거 공세와 김부선 반응에 대한 전언이다. 새 증거가 제시된 것으로 분류하지 않는다.", sources: ["debate2025", "campaign2025"] },
];

export const timelinePeriods = [
  { id: "initial", title: "초기 의혹과 번복", range: "2007~2016", description: "주장 속 만남의 시기와 실제 공개 시기를 나눠 읽습니다." },
  { id: "election2018", title: "경기지사 선거와 수사", range: "2018", description: "토론·녹취·방송을 통해 확대된 의혹이 어떤 검증을 받았는지 봅니다." },
  { id: "litigation", title: "재점화와 민사소송", range: "2019~2022", description: "후속 고발, 대선 경선과 기자회견, 증거 신청과 소 취하를 잇습니다." },
  { id: "recent", title: "후속 주장과 대선 재거론", range: "2023~최근", description: "새 발언이 기존 수사 결과를 바꾼 것인지 구분합니다." },
] as const;

export const referenceVideo = {
  title: "김용남도 이해 안 갔던 KBS 김부선 출연",
  channel: "민주는 파출부",
  url: "https://www.youtube.com/shorts/ahmp6frEZzA",
  publishedAt: "2026-10-03",
  durationSec: 38,
  note: "YouTube 공개 페이지와 oEmbed로 제목·채널·게시일·길이를 확인했다. 공개 자막 요청은 빈 응답이었으며 전사·발언 구간·원방송은 미확인이다. 제목에서 조직적 개입의 증거를 추론하지 않는다.",
} as const;
