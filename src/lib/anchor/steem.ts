import { Client, PrivateKey } from "@upvu/dsteem";
import { CUSTOM_JSON_ID, type SendAnchor } from "./broadcast";
import { ANCHOR_ACCOUNT, STEEM_NODES } from "./config";

// Only a posting key is ever held here: it can add records but cannot move
// funds or change keys, and nothing it signs can alter what is already on chain.
export function steemSender(): SendAnchor | null {
  const key = process.env.STEEM_ANCHOR_POSTING;
  if (!key) return null;
  const client = new Client(STEEM_NODES, { timeout: 15_000 });
  const privateKey = PrivateKey.fromString(key);
  return async (message) => {
    const confirmation = await client.broadcast.json({
      id: CUSTOM_JSON_ID,
      json: JSON.stringify(message),
      required_auths: [],
      required_posting_auths: [ANCHOR_ACCOUNT],
    }, privateKey);
    return { txId: confirmation.id, blockNum: confirmation.block_num };
  };
}
