// Fixed reasons, so reports can be sorted and a subject's own request
// (photo, correction) is recognisable at a glance. Shared by the form and the API.
export const REPORT_REASONS = ["사실과 다름", "화자·날짜 오류", "출처 문제", "명예훼손·모욕", "사진 교체·삭제 요청", "본인 요청", "기타"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const PHOTO_REASON: ReportReason = "사진 교체·삭제 요청";
// A record has no photo; a person has no speaker or source of their own.
export const RECORD_REASONS = REPORT_REASONS.filter((reason) => reason !== PHOTO_REASON);
export const PERSON_REASONS = REPORT_REASONS.filter((reason) => reason !== "화자·날짜 오류" && reason !== "출처 문제");
