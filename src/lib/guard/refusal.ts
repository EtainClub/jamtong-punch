export class Refusal extends Error {
  constructor(
    public readonly status: number,
    public readonly reason: string,
    public readonly clientCode = "rejected",
  ) {
    super(reason);
  }
}

export function refusalResponse(error: unknown): Response {
  if (error instanceof Refusal) {
    console.warn("request-refused", { reason: error.reason });
    return Response.json({ error: error.clientCode }, { status: error.status });
  }
  console.error("request-failed", error);
  return Response.json({ error: "internal" }, { status: 500 });
}
