"use client";

import { useEffect, useMemo, useState } from "react";
import { canonicalJson, sha256Hex } from "@/lib/anchor/canonical";
import type { AnchorVersion } from "@/lib/anchor/versions";
import styles from "./archive.module.css";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "matched"; node: string; timestamp: string }
  | { state: "mismatched"; chainHash: string | null }
  | { state: "failed"; reason: string };

type Operation = [string, { id?: string; json?: string; required_posting_auths?: string[] }];
type Block = { timestamp: string; transaction_ids: string[]; transactions: Array<{ operations: Operation[] }> };

// Reads the block straight from a public Steem node. The page's own server is
// deliberately not in this path: the point is to check 임통 against the chain.
async function fetchBlock(nodes: string[], blockNum: number): Promise<{ block: Block; node: string }> {
  let lastError = "no node";
  for (const node of nodes) {
    try {
      const response = await fetch(node, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "condenser_api.get_block", params: [blockNum], id: 1 }),
      });
      const body = await response.json() as { result?: Block; error?: { message?: string } };
      if (body.result) return { block: body.result, node };
      lastError = body.error?.message ?? `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

function short(hash: string | null) {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "—";
}

const OP_LABELS = { publish: "공개", update: "수정", retract: "내림" } as const;

export function VerifyPanel({ payload, versions, account, nodes, customJsonId }: { payload: unknown; versions: AnchorVersion[]; account: string; nodes: string[]; customJsonId: string }) {
  const json = useMemo(() => canonicalJson(payload), [payload]);
  const [hash, setHash] = useState<string | null>(null);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  useEffect(() => { void sha256Hex(json).then(setHash); }, [json]);

  const latest = [...versions].reverse().find((version) => version.hash);
  const anchored = latest?.txId && latest.blockNum ? latest : null;
  const download = useMemo(() => `data:application/json;charset=utf-8,${encodeURIComponent(json)}`, [json]);

  async function verify() {
    if (!anchored || !hash) return;
    setCheck({ state: "checking" });
    try {
      const { block, node } = await fetchBlock(nodes, anchored.blockNum!);
      const index = block.transaction_ids.indexOf(anchored.txId!);
      if (index < 0) throw new Error("블록에서 거래를 찾지 못했습니다");
      const operation = block.transactions[index].operations.find(([name, body]) => name === "custom_json" && body.id === customJsonId && body.required_posting_auths?.includes(account));
      if (!operation) throw new Error("임통 기록이 아닌 거래입니다");
      const message = JSON.parse(operation[1].json ?? "{}") as { h?: string | null };
      setCheck(message.h === hash ? { state: "matched", node, timestamp: block.timestamp } : { state: "mismatched", chainHash: message.h ?? null });
    } catch (error) {
      setCheck({ state: "failed", reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return <section className={styles.verify} aria-labelledby="verify-title">
    <h2 id="verify-title">블록체인 대조</h2>
    <p className={styles.note}>이 기록의 내용으로 만든 지문(SHA-256)이 Steem 블록체인의 <b>@{account}</b> 계정 기록에 남아 있습니다. 블록체인 기록은 누구도 고치거나 지울 수 없어서, 임통의 기록이 나중에 몰래 바뀌면 여기서 드러납니다.</p>
    <dl className={styles.verifyFacts}>
      <dt>지금 화면 내용의 지문</dt><dd><code>{hash ?? "계산 중…"}</code></dd>
      <dt>블록체인에 남은 지문</dt><dd><code>{anchored?.hash ?? "아직 없음"}</code></dd>
    </dl>
    {!latest && <p className={styles.gone}>아직 블록체인에 기록되지 않았습니다.</p>}
    {latest && !anchored && <p className={styles.gone}>블록체인 기록을 기다리는 중입니다. 보통 몇 분 안에 올라갑니다.</p>}
    {anchored && <>
      <button className={styles.stanceButton} type="button" onClick={() => void verify()} disabled={!hash || check.state === "checking"}>{check.state === "checking" ? "블록체인에서 읽는 중…" : "블록체인에서 직접 대조하기"}</button>
      <p className={styles.verifyResult} aria-live="polite">
        {check.state === "matched" && <>✓ 일치합니다. 블록 {anchored.blockNum}에 {check.timestamp.replace("T", " ")} (UTC) 기록된 지문과 지금 화면의 내용이 같습니다. <small>조회 노드: {check.node}</small></>}
        {check.state === "mismatched" && <>✗ 다릅니다. 블록체인의 지문은 <code>{short(check.chainHash)}</code>입니다. 기록이 수정된 뒤 새 버전이 아직 올라가지 않았거나, 내용이 바뀌었습니다. 아래 이력을 확인하세요.</>}
        {check.state === "failed" && <>블록체인을 읽지 못했습니다: {check.reason}</>}
      </p>
    </>}
    <h3 className={styles.verifySub}>기록 이력</h3>
    <ol className={styles.verifyHistory}>{versions.map((version) => <li key={version.v}>
      v{version.v} · {OP_LABELS[version.op]} · {version.anchoredAt ? version.anchoredAt.slice(0, 10) : "대기 중"} · 지문 <code>{short(version.hash)}</code>
      {version.blockNum && <> · 블록 {version.blockNum} · 거래 <code>{version.txId!.slice(0, 12)}…</code></>}
    </li>)}</ol>
    <details className={styles.context}>
      <summary>직접 확인하는 방법</summary>
      <p>1. <a href={download} download="imtong-record.json">대조용 원문 JSON 내려받기</a> 후 <code>shasum -a 256 imtong-record.json</code>의 결과가 위 지문과 같은지 봅니다.</p>
      <p>2. 아무 Steem 노드에 <code>condenser_api.get_block</code>으로 블록 {anchored?.blockNum ?? "번호"}를 요청해, 거래 <code>{anchored?.txId ?? "ID"}</code>의 custom_json(id: {customJsonId}, 작성 계정 @{account})에 담긴 <code>h</code> 값과 비교합니다.</p>
      <p>임통 서버를 거치지 않고도 같은 결과가 나와야 합니다.</p>
    </details>
  </section>;
}
