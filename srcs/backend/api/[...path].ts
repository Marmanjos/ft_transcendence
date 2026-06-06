export default async function handler(req: any, res: any) {
  try {
    let mod: any;
    let app: any;

    const fmtErr = (e: unknown) => {
      if (typeof e === "object" && e !== null) {
        const anyE = e as any;
        return anyE.stack ?? anyE.message ?? String(e);
      }
      return String(e);
    };

    try {
      mod = await import("../src/app.js");
      app = mod && (mod.default ?? mod);
    } catch (e1: unknown) {
      console.warn("Import ../src/app.js failed, attempting ../dist/index.mjs", fmtErr(e1));
      try {
        // try the compiled dist bundle as a fallback
        const distPath = "../dist/index.mjs";
        // use a non-literal import specifier so TS doesn't try to resolve types for the runtime-only bundle
        mod = await import(distPath as any);
        app = mod && (mod.default ?? mod);
      } catch (e2: unknown) {
        console.error("Both ../src/app and ../dist/index.mjs failed to import:", fmtErr(e1), fmtErr(e2));
        throw e1;
      }
    }

    if (typeof req.url === "string" && !req.url.startsWith("/api")) {
      req.url = req.url.startsWith("/") ? `/api${req.url}` : `/api/${req.url}`;
    }

    return app(req, res);
  } catch (err: any) {
    console.error("Vercel function wrapper failed to load app or handle request:", err && (err.stack || err.message || err));
    try {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "FUNCTION_INVOCATION_FAILED", message: String(err && err.message ? err.message : err) }));
    } catch (_) {
      // ignore secondary errors while sending response
    }
    return;
  }
}