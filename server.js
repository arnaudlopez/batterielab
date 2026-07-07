import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const quoteFile = path.join(dataDir, "quotes.json");
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "";
const staticTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
]);
const publicFiles = new Set(["/index.html", "/styles.css", "/app.js"]);

await fs.mkdir(dataDir, { recursive: true });

function jsonResponse(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function htmlResponse(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }
  return "";
}

function money(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("fr-FR")} EUR`;
}

function fixed(value, digits = 1) {
  const number = Number(value || 0);
  return number.toLocaleString("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: number % 1 === 0 ? 0 : digits,
  });
}

async function readQuotes() {
  try {
    const parsed = JSON.parse(await fs.readFile(quoteFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQuotes(quotes) {
  await fs.writeFile(quoteFile, JSON.stringify(quotes, null, 2));
}

function quoteUrl(req, id) {
  const origin = publicBaseUrl || `http://${req.headers.host}`;
  return `${origin.replace(/\/$/, "")}/devis/${id}`;
}

function smtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

async function sendQuoteEmail(quote, url) {
  if (!smtpReady()) return { sent: false, message: "SMTP non configure" };
  if (!quote.quote?.customerEmail) return { sent: false, message: "email client manquant" };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = `Votre devis ${quote.quote.number || "BatterieLab"}`;
  const text = [
    `Bonjour ${quote.quote.customerName || ""},`,
    "",
    "Votre devis BatterieLab est disponible ici :",
    url,
    "",
    `Total : ${money(quote.quote.salePrice)}`,
    "",
    "Vous pouvez consulter les caracteristiques de la batterie et utiliser le lien PayPal depuis la page du devis.",
  ].join("\n");

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: quote.quote.customerEmail,
    replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM,
    subject,
    text,
    html: `<p>Bonjour ${escapeHtml(quote.quote.customerName || "")},</p><p>Votre devis BatterieLab est disponible ici :</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><p>Total : <strong>${escapeHtml(money(quote.quote.salePrice))}</strong></p>`,
  });
  return { sent: true, message: "envoye" };
}

function publicQuoteHtml(quote) {
  const q = quote.quote || {};
  const state = quote.state || {};
  const results = quote.results || {};
  const paypalUrl = safeUrl(q.paypalUrl);
  const logo = quote.logoDataUrl ? `<img class="logo" src="${quote.logoDataUrl}" alt="" />` : "";
  const topSvg = quote.topSvg || "";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(q.number || "Devis BatterieLab")}</title>
    <style>
      :root{--ink:#17201d;--muted:#66736e;--line:#d7ded8;--surface:#fff;--bg:#f4f5f2;--accent:#0f766e}
      *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      main{max-width:1120px;margin:0 auto;padding:24px}.paper{background:#fff;border:1px solid var(--line);border-radius:8px;padding:30px}
      .header,.parties,.totals,.battery{display:grid;grid-template-columns:1.35fr .85fr;gap:24px}.header{border-bottom:1px solid var(--line);padding-bottom:20px}
      .brand{display:flex;gap:16px;align-items:flex-start}.logo{width:90px;height:90px;object-fit:contain;border:1px solid var(--line);border-radius:6px;padding:6px}
      h1,h2,h3,p{margin:0}p,.muted{color:var(--muted);line-height:1.45;white-space:pre-line}.meta{text-align:right;display:grid;gap:5px}.meta strong{font-size:30px}
      h3{margin:0 0 8px;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.06em}.parties,.battery,.totals,.legal{margin-top:24px}
      .visual{border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto}.visual svg{width:100%;height:auto;display:block}
      .specs{display:grid;grid-template-columns:1fr auto;gap:10px 16px;border:1px solid var(--line);border-radius:8px;padding:14px}.specs span{color:var(--muted)}.specs strong{text-align:right}
      table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid var(--line);padding:12px 10px;text-align:left;vertical-align:top}th:last-child,td:last-child{text-align:right;white-space:nowrap}
      .total-box{justify-self:end;width:min(100%,320px);display:grid;grid-template-columns:1fr auto;gap:10px 16px;background:#eef2ee;border:1px solid var(--line);border-radius:8px;padding:16px}.total-box span{color:var(--muted)}
      .paypal{display:inline-flex;gap:9px;margin-top:10px;min-height:40px;align-items:center;border:1px solid #d6a400;border-radius:6px;background:#ffc439;color:#16202a;padding:9px 15px;text-decoration:none;font-weight:700}.paypal-mark{display:inline-flex;align-items:center;min-height:24px;border-radius:4px;background:#003087;color:#fff;padding:2px 7px;font-weight:800}.payment-url{margin-top:8px;color:var(--accent);font-size:13px;overflow-wrap:anywhere}.legal{border-top:1px solid var(--line);padding-top:16px;font-size:13px}
      @media(max-width:760px){main{padding:12px}.paper{padding:18px}.header,.parties,.totals,.battery{grid-template-columns:1fr}.meta{text-align:left}.total-box{justify-self:stretch}}
      @media print{body{background:#fff}main{padding:0}.paper{border:0;border-radius:0}.paypal{background:#fff;border:1px solid #16202a;color:#16202a}.paypal-mark{background:#fff;border:1px solid #003087;color:#003087}}
    </style>
  </head>
  <body>
    <main>
      <article class="paper">
        <header class="header">
          <div class="brand">${logo}<div><h1>${escapeHtml(q.companyName || "BatterieLab")}</h1><p>${escapeHtml(q.companyAddress || "")}</p></div></div>
          <div class="meta"><strong>Devis</strong><span>${escapeHtml(q.number || quote.id)}</span><span>${escapeHtml(q.date || "")}</span><span>Valable jusqu'au ${escapeHtml(q.validUntil || "")}</span></div>
        </header>
        <section class="parties">
          <div><h3>Emetteur</h3><p>${escapeHtml(q.companyLegal || "")}</p></div>
          <div><h3>Client</h3><strong>${escapeHtml(q.customerName || "")}</strong><p>${escapeHtml(q.customerAddress || "")}</p></div>
        </section>
        <section class="battery">
          <div><h3>Batterie</h3><div class="visual">${topSvg}</div></div>
          <div class="specs">
            <span>Architecture</span><strong>${escapeHtml(`${state.series || ""}S${state.parallel || ""}P`)}</strong>
            <span>Cellules</span><strong>${escapeHtml(String(results.cellCount || ""))}</strong>
            <span>Tension nominale</span><strong>${fixed(results.nominalVoltage)} V</strong>
            <span>Energie</span><strong>${Math.round(results.energyWh || 0).toLocaleString("fr-FR")} Wh</strong>
            <span>Decharge max</span><strong>${fixed(results.maxDischargeA)} A</strong>
            <span>Enveloppe</span><strong>${fixed(results.packLength)} x ${fixed(results.packWidth)} x ${fixed(results.packHeight)} mm</strong>
          </div>
        </section>
        <table>
          <thead><tr><th>Description</th><th>Details</th><th>Total</th></tr></thead>
          <tbody><tr><td>Pack batterie sur mesure</td><td>${escapeHtml(`${state.series || ""}S${state.parallel || ""}P - ${results.cellCount || ""} cellules ${state.cellPreset || ""}`)}<br>${fixed(results.capacityAh)} Ah - ${Math.round(results.energyWh || 0).toLocaleString("fr-FR")} Wh</td><td>${money(q.salePrice)}</td></tr></tbody>
        </table>
        <section class="totals">
          <div><h3>Paiement</h3><p>${escapeHtml(q.paymentTerms || "")}</p>${paypalUrl ? `<a class="paypal" href="${escapeHtml(paypalUrl)}" target="_blank" rel="noopener"><span class="paypal-mark">PayPal</span><span>Payer en ligne</span></a><p class="payment-url">Lien de paiement : ${escapeHtml(paypalUrl)}</p>` : ""}</div>
          <div class="total-box"><span>Total devis</span><strong>${money(q.salePrice)}</strong><span>Acompte</span><strong>${money(q.depositAmount)} (${fixed(q.depositPercent)} %)</strong></div>
        </section>
        <section class="legal"><h3>Mentions</h3><p>${escapeHtml(q.legalTerms || "")}</p></section>
      </article>
    </main>
  </body>
</html>`;
}

async function readBody(req, maxBytes = 5_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Payload trop volumineux");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function createQuote(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    if (!body.quote?.customerEmail) return jsonResponse(res, 400, { error: "Email client requis" });

    const id = crypto.randomBytes(12).toString("base64url");
    const quote = {
      id,
      createdAt: new Date().toISOString(),
      state: body.state || {},
      results: body.results || {},
      quote: body.quote || {},
      logoDataUrl: body.logoDataUrl || "",
      topSvg: body.topSvg || "",
    };
    const quotes = await readQuotes();
    quotes.push(quote);
    await writeQuotes(quotes);

    const url = quoteUrl(req, id);
    const email = await sendQuoteEmail(quote, url);
    jsonResponse(res, 201, { id, url, emailSent: email.sent, emailMessage: email.message });
  } catch (error) {
    jsonResponse(res, 400, { error: error.message || "Creation impossible" });
  }
}

async function serveQuote(req, res, id) {
  const quote = (await readQuotes()).find((item) => item.id === id);
  if (!quote) return htmlResponse(res, 404, "<h1>Devis introuvable</h1>");
  htmlResponse(res, 200, publicQuoteHtml(quote));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (!publicFiles.has(pathname)) return htmlResponse(res, 404, "Not found");
  const filePath = path.normalize(path.join(__dirname, pathname));
  if (!filePath.startsWith(__dirname)) return htmlResponse(res, 403, "Forbidden");
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": staticTypes.get(path.extname(filePath)) || "application/octet-stream" });
    res.end(data);
  } catch {
    htmlResponse(res, 404, "Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && url.pathname === "/favicon.ico") {
    res.writeHead(204);
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/api/health") return jsonResponse(res, 200, { ok: true });
  if (req.method === "POST" && url.pathname === "/api/quotes") return createQuote(req, res);
  if (req.method === "GET" && url.pathname.startsWith("/devis/")) return serveQuote(req, res, url.pathname.split("/").pop());
  if (req.method === "GET") return serveStatic(req, res);
  jsonResponse(res, 405, { error: "Method not allowed" });
});

server.listen(port, () => {
  console.log(`BatterieLab listening on :${port}`);
});
