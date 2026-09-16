/**
 * Status deployment Vercel terbaru untuk Preview (Phase 13). Request nyata
 * ke Vercel API — kalau project belum di-link, jawab jujur "not_linked",
 * bukan pura-pura render preview kosong.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { vercelProjectId } = (await req.json()) as { vercelProjectId?: string };

  if (!vercelProjectId) {
    return new Response(JSON.stringify({ linked: false }), { status: 200, headers: { "content-type": "application/json" } });
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ linked: true, error: "VERCEL_TOKEN belum dikonfigurasi di Vercel Environment Variables." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${vercelProjectId}&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Vercel API mengembalikan status ${res.status}`);
    const data = await res.json();
    const latest = data.deployments?.[0];

    if (!latest) {
      return new Response(JSON.stringify({ linked: true, hasDeployment: false }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        linked: true,
        hasDeployment: true,
        state: latest.state, // BUILDING | READY | ERROR | QUEUED | CANCELED
        url: `https://${latest.url}`,
        createdAt: latest.createdAt
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ linked: true, error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
