import { randomUUID } from "node:crypto";
import { storage } from "@/lib/firebase/admin";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { verifyCaller } from "@/lib/guard/identity";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    if (!caller.isOps) throw new Refusal(403, "ops-required");

    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) throw new Refusal(400, "image-required");
    const extension = extensions[file.type];
    if (!extension) throw new Refusal(400, "unsupported-image-type");
    if (!file.size || file.size > MAX_BYTES) throw new Refusal(400, "image-too-large");

    const objectPath = `public/content/${caller.uid}/${randomUUID()}.${extension}`;
    const downloadToken = randomUUID();
    const bucket = storage.bucket();
    await bucket.file(objectPath).save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      metadata: {
        contentType: file.type,
        cacheControl: "public,max-age=31536000,immutable",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    return Response.json({
      path: objectPath,
      url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`,
    });
  } catch (error) {
    return refusalResponse(error);
  }
}