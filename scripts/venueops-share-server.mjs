import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 4173);
const backendOrigin = new URL(process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001");
const publicHost = process.env.PUBLIC_HOST?.trim();

const getRequestHostName = (request) => {
  const header = request.headers.host || "";
  const hostName = header.startsWith("[") ? header.slice(1, header.indexOf("]")) : header.split(":")[0];
  return hostName.toLowerCase();
};

const shouldRedirectToPublicHost = (request) => {
  if (!publicHost) {
    return false;
  }

  const requestHostName = getRequestHostName(request);
  return requestHostName === "localhost" || requestHostName === "127.0.0.1" || requestHostName === "::1";
};

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const isInsideDist = (filePath) => filePath === distRoot || filePath.startsWith(`${distRoot}${sep}`);

const writeText = (response, statusCode, message) => {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(message);
};

const writeResetLocalCachePage = (response) => {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Reset VenueOps Local Cache</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
      main { width: min(520px, calc(100vw - 32px)); background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
      h1 { font-size: 22px; margin: 0 0 8px; }
      p { line-height: 1.5; margin: 0 0 16px; color: #475569; }
      a { color: #0f766e; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <h1>VenueOps local cache reset</h1>
      <p>This browser's sign-in and UI cache has been cleared. Setup and workflow records were preserved. You will be sent back to the ERP in a moment.</p>
      <p><a href="/">Return now</a></p>
    </main>
    <script>
      const preservedPrefixes = ["venueops_master_", "workflow:"];
      const preservedEntries = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !preservedPrefixes.some((prefix) => key.startsWith(prefix))) {
          continue;
        }

        const value = localStorage.getItem(key);
        if (value !== null) {
          preservedEntries.push([key, value]);
        }
      }

      localStorage.clear();
      preservedEntries.forEach(([key, value]) => localStorage.setItem(key, value));
      sessionStorage.clear();
      setTimeout(() => { window.location.replace("/"); }, 1200);
    </script>
  </body>
</html>`);
};

const proxyApi = (clientRequest, clientResponse) => {
  const targetUrl = new URL(clientRequest.url || "/", backendOrigin);
  const headers = { ...clientRequest.headers, host: backendOrigin.host };
  delete headers.origin;

  const proxyRequest = (backendOrigin.protocol === "https:" ? httpsRequest : httpRequest)(
    {
      protocol: backendOrigin.protocol,
      hostname: backendOrigin.hostname,
      port: backendOrigin.port,
      method: clientRequest.method,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      headers,
    },
    (proxyResponse) => {
      clientResponse.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(clientResponse);
    },
  );

  proxyRequest.on("error", (error) => {
    writeText(clientResponse, 502, `Backend is not reachable: ${error.message}`);
  });

  clientRequest.pipe(proxyRequest);
};

const serveFile = async (response, filePath) => {
  const fileStat = await stat(filePath);
  const contentType = mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream";
  const isAsset = filePath.includes(`${sep}assets${sep}`);

  response.writeHead(200, {
    "content-type": contentType,
    "content-length": fileStat.size,
    "cache-control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(filePath).pipe(response);
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://localhost");

    if (shouldRedirectToPublicHost(request)) {
      response.writeHead(307, {
        location: `http://${publicHost}:${port}${requestUrl.pathname}${requestUrl.search}`,
        "cache-control": "no-store",
      });
      response.end();
      return;
    }

    if (requestUrl.pathname === "/reset-local-cache") {
      writeResetLocalCachePage(response);
      return;
    }

    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      proxyApi(request, response);
      return;
    }

    const requestedPath = decodeURIComponent(requestUrl.pathname);
    let filePath = resolve(distRoot, `.${requestedPath}`);

    if (!isInsideDist(filePath)) {
      writeText(response, 403, "Forbidden");
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = resolve(filePath, "index.html");
      }
    } catch {
      filePath = resolve(distRoot, "index.html");
    }

    await serveFile(response, filePath);
  } catch (error) {
    writeText(response, 500, `Share server error: ${error.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`VenueOps share server listening on http://${host}:${port}`);
  if (publicHost) {
    console.log(`Redirecting localhost users to http://${publicHost}:${port}`);
  }
  console.log(`Proxying API requests to ${backendOrigin.href}`);
});
