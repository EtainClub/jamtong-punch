// The account whose custom_json records carry 임통's anchors, and the public
// nodes used to send and to check them. Readable anywhere; holds no secrets.
export const ANCHOR_ACCOUNT = process.env.STEEM_ANCHOR_ACCOUNT ?? "ppebak";
export const STEEM_NODES = (process.env.STEEM_RPC_NODES ?? "https://api.steemit.com,https://api.moecki.online").split(",").map((node) => node.trim()).filter(Boolean);
