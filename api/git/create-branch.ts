/**
 * Buat branch baru dari branch sumber (Phase 12).
 */
import { createBranch } from "../github/git";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { repoFullName, newBranch, fromBranch } = (await req.json()) as {
    repoFullName: string;
    newBranch: string;
    fromBranch: string;
  };

  try {
    await createBranch(repoFullName, newBranch, fromBranch);
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
