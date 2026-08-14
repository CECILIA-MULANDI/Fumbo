export function firstMessage(...errors: unknown[]): string | null {
  for (const err of errors) {
    if (!err) continue;
    if (typeof err === "object" && err !== null && "message" in err) {
      const msg = (err as { message: unknown }).message;
      if (typeof msg === "string") return msg.split("\n")[0];
    }
  }
  return null;
}
