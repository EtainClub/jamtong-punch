import { Client, PrivateKey, type Operation } from "@upvu/dsteem";
import { CUSTOM_JSON_ID, type AnchorMessage, type SendAnchor } from "./broadcast";
import { ANCHOR_ACCOUNT, STEEM_NODES } from "./config";

type HistoryItem = [number, { block: number; trx_id: string; op: [string, { id?: string; json?: string }] }];

// A message already on chain under our account, if any. Checked before every
// send: when a broadcast succeeds but its reply is lost, sending again would
// put the same version on chain twice.
async function findOnChain(client: Client, message: AnchorMessage) {
  const history = await client.call("condenser_api", "get_account_history", [ANCHOR_ACCOUNT, -1, 100]) as HistoryItem[];
  for (const [, item] of history) {
    if (item.op[0] !== "custom_json" || item.op[1].id !== CUSTOM_JSON_ID) continue;
    try {
      const found = JSON.parse(item.op[1].json ?? "{}") as Partial<AnchorMessage>;
      if (found.t === message.t && found.id === message.id && found.v === message.v && found.h === message.h) return { txId: item.trx_id, blockNum: item.block };
    } catch { /* someone else's malformed json under the same id */ }
  }
  return null;
}

// Only a posting key is ever held here: it can add records but cannot move
// funds or change keys, and nothing it signs can alter what is already on chain.
export function steemSender(): SendAnchor | null {
  const key = process.env.STEEM_ANCHOR_POSTING;
  if (!key) return null;
  const client = new Client(STEEM_NODES, { timeout: 30_000 });
  const privateKey = PrivateKey.fromString(key);
  return async (message) => {
    const existing = await findOnChain(client, message);
    if (existing) return existing;
    const props = await client.database.getDynamicGlobalProperties();
    const operation: Operation = ["custom_json", { id: CUSTOM_JSON_ID, json: JSON.stringify(message), required_auths: [], required_posting_auths: [ANCHOR_ACCOUNT] }];
    const signed = client.broadcast.sign({
      ref_block_num: props.head_block_number & 0xffff,
      ref_block_prefix: Buffer.from(props.head_block_id, "hex").readUInt32LE(4),
      expiration: new Date(new Date(`${props.time}Z`).getTime() + 60_000).toISOString().slice(0, -5),
      operations: [operation],
      extensions: [],
    }, privateKey);
    // The synchronous call waits for the block, so the block number is known
    // and the verify page can read it straight away.
    const result = await client.call("condenser_api", "broadcast_transaction_synchronous", [signed]) as { id: string; block_num: number };
    return { txId: result.id, blockNum: result.block_num };
  };
}
