import { fetchRepos, getTotalStars } from "./github";

const PORT = Number(process.env.PORT) || 3001;
const CERTS_DIR = new URL("../certs/", import.meta.url).pathname;
const useTls = process.env.USE_TLS !== "false";

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: PORT,
  ...(useTls && {
    tls: {
      key: Bun.file(`${CERTS_DIR}server.key`),
      cert: Bun.file(`${CERTS_DIR}server.crt`),
    },
  }),
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      const html = await Bun.file(
        new URL("index.html", import.meta.url).pathname
      ).text();
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", service: "how-many-stars" });
    }

    if (url.pathname === "/api/repos") {
      try {
        const repos = await fetchRepos();
        const totalStars = getTotalStars(repos);
        return Response.json({ repos, totalStars });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

const protocol = useTls ? "https" : "http";
console.log(`Server running at ${protocol}://localhost:${server.port}`);
if (useTls) {
  console.log(`Tailscale: https://openwebui.taila8bee6.ts.net:${server.port}`);
}
