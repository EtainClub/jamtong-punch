import { getNickname } from "@/lib/contributors/profile";
import type { Actor } from "@/lib/content/store";
import type { Caller } from "@/lib/guard/identity";
import { Refusal } from "@/lib/guard/refusal";

// Who may use the content editor: operators, and anyone signed in with a real
// account (contributors). Anonymous visitors may not. Client codes are shown
// to the user as-is, so they are written as sentences.
export function requireEditor(caller: Caller) {
  if (!caller.isOps && !caller.isContributor) throw new Refusal(403, "editor-required", "구글 계정으로 로그인해야 등록할 수 있습니다.");
}

export async function editorActor(caller: Caller): Promise<Actor> {
  requireEditor(caller);
  if (caller.isOps) return { uid: caller.uid, isOps: true };
  const nickname = await getNickname(caller.uid);
  if (!nickname) throw new Refusal(400, "nickname-required", "등록하기 전에 닉네임을 정해 주세요.");
  return { uid: caller.uid, isOps: false, nickname };
}
