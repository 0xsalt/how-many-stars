import { fetchRepos, getTotalStars, getLanguageBreakdown, USERNAME } from "./github";

const PORT = Number(process.env.PORT) || 3001;
const CERTS_DIR = new URL("../certs/", import.meta.url).pathname;
const useTls = process.env.USE_TLS !== "false";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  ...(useTls && {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  }),
};

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "connect-src https://api.github.com",
  "img-src data:",
].join("; ");

const HTML_HEADERS: Record<string, string> = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy": CSP,
};

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
      const raw = await Bun.file(
        new URL("index.html", import.meta.url).pathname
      ).text();
      const html = raw.replaceAll("0xsalt", USERNAME);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, must-revalidate",
          ...HTML_HEADERS,
        },
      });
    }

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", service: "how-many-stars" }, {
        headers: SECURITY_HEADERS,
      });
    }

    if (url.pathname === "/api/repos") {
      try {
        const repos = await fetchRepos();
        const totalStars = getTotalStars(repos);
        const languages = getLanguageBreakdown(repos);
        return Response.json({ repos, totalStars, languages }, {
          headers: { "Cache-Control": "public, max-age=300", ...SECURITY_HEADERS },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return Response.json({ error: message }, {
          status: 500,
          headers: SECURITY_HEADERS,
        });
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: SECURITY_HEADERS,
    });
  },
});

const protocol = useTls ? "https" : "http";
console.log(`Server running at ${protocol}://localhost:${server.port}`);
if (useTls) {
  console.log(`Tailscale: https://${process.env.TAILSCALE_HOST || 'localhost'}:${server.port}`);
}
