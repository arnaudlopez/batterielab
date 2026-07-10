import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import puppeteer from "puppeteer-core";

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

function weight(valueG) {
  return `${fixed(Number(valueG || 0) / 1000, 2)} kg`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findChromiumExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  throw new Error("Chromium introuvable pour generer le PDF");
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
  const q = quote.quote || {};
  const itemPrice = Number(q.itemPrice ?? q.salePrice ?? 0);
  const shippingCost = Number(q.shippingCost || 0);
  const totalPrice = Number(q.salePrice ?? itemPrice + shippingCost);

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
    shippingCost > 0 ? `Frais d'envoi : ${money(shippingCost)}` : "",
    `Total : ${money(totalPrice)}`,
    "",
    "Vous pouvez consulter les caracteristiques de la batterie et utiliser le lien PayPal depuis la page du devis.",
  ].filter((line) => line !== "").join("\n");

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: quote.quote.customerEmail,
    replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM,
    subject,
    text,
    html: `<p>Bonjour ${escapeHtml(quote.quote.customerName || "")},</p><p>Votre devis BatterieLab est disponible ici :</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>${shippingCost > 0 ? `<p>Frais d'envoi : <strong>${escapeHtml(money(shippingCost))}</strong></p>` : ""}<p>Total : <strong>${escapeHtml(money(totalPrice))}</strong></p>`,
  });
  return { sent: true, message: "envoye" };
}

function publicQuoteHtml(quote, options = {}) {
  const q = quote.quote || {};
  const state = quote.state || {};
  const results = quote.results || {};
  const paypalUrl = safeUrl(q.paypalUrl);
  const itemPrice = Number(q.itemPrice ?? q.salePrice ?? 0);
  const shippingCost = Number(q.shippingCost || 0);
  const totalPrice = Number(q.salePrice ?? itemPrice + shippingCost);
  const depositAmount = Number(q.depositAmount ?? totalPrice * (Number(q.depositPercent || 0) / 100));
  const totalWeightG = Number(results.totalWeightG || 0);
  const weightSpec = totalWeightG > 0 ? `<span>Poids estime</span><strong>${weight(totalWeightG)}</strong>` : "";
  const weightDetail = totalWeightG > 0 ? `<br>Poids estime : ${weight(totalWeightG)}` : "";
  const shippingRow = shippingCost > 0
    ? `<tr><td>Frais d'envoi</td><td>Expedition au destinataire</td><td>${money(shippingCost)}</td></tr>`
    : "";
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
      .paypal{display:inline-flex;gap:9px;margin-top:10px;min-height:40px;align-items:center;border:1px solid #d6a400;border-radius:6px;background:#ffc439;color:#16202a;padding:9px 15px;text-decoration:none;font-weight:700}.paypal-mark{display:inline-flex;align-items:center;min-height:24px;border-radius:4px;background:#fff;border:1px solid #d8e1f0;color:#003087;padding:2px 7px;font-weight:800}.paypal-mark span:last-child{color:#009cde}.payment-url{margin-top:8px;color:var(--accent);font-size:13px;overflow-wrap:anywhere}.legal{border-top:1px solid var(--line);padding-top:16px;font-size:13px}
      body.pdf-export{background:#fff;font-size:12px}body.pdf-export main{max-width:none;padding:0}body.pdf-export .paper{border:0;border-radius:0;padding:0}body.pdf-export .header{grid-template-columns:1fr auto;gap:18px;padding-bottom:12px}body.pdf-export .brand{gap:12px}body.pdf-export .logo{width:64px;height:64px}body.pdf-export h1{font-size:26px}body.pdf-export .meta strong{font-size:26px}body.pdf-export .parties{grid-template-columns:1fr 1fr;gap:18px;margin-top:14px}body.pdf-export .battery{grid-template-columns:1.2fr .8fr;gap:16px;margin-top:16px;break-inside:avoid}body.pdf-export .visual{padding:8px;max-height:250px;overflow:hidden}body.pdf-export .visual svg{height:232px;width:100%;object-fit:contain}body.pdf-export .specs{gap:7px 12px;padding:10px}body.pdf-export table{margin-top:16px;font-size:12px;break-inside:avoid}body.pdf-export th,body.pdf-export td{padding:8px}body.pdf-export .totals{grid-template-columns:1fr 280px;gap:18px;margin-top:16px;break-inside:avoid}body.pdf-export .legal{margin-top:16px;font-size:11px}
      @media(max-width:760px){main{padding:12px}.paper{padding:18px}.header,.parties,.totals,.battery{grid-template-columns:1fr}.meta{text-align:left}.total-box{justify-self:stretch}}
      @media print{@page{size:A4;margin:12mm}body{background:#fff}main{padding:0}.paper{border:0;border-radius:0}.paypal-mark{background:#fff;color:#003087}.paypal-mark span:last-child{color:#009cde}}
    </style>
  </head>
  <body class="${options.pdf ? "pdf-export" : ""}">
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
            ${weightSpec}
            <span>Decharge max</span><strong>${fixed(results.maxDischargeA)} A</strong>
            <span>Facteur limitant</span><strong>${escapeHtml(results.dischargeLimit || "Cellules")}</strong>
            <span>Enveloppe</span><strong>${fixed(results.packLength)} x ${fixed(results.packWidth)} x ${fixed(results.packHeight)} mm</strong>
          </div>
        </section>
        <table>
          <thead><tr><th>Description</th><th>Details</th><th>Total</th></tr></thead>
          <tbody><tr><td>Pack batterie sur mesure</td><td>${escapeHtml(`${state.series || ""}S${state.parallel || ""}P - ${results.cellCount || ""} cellules ${state.cellPreset || ""}`)}<br>${fixed(results.capacityAh)} Ah - ${Math.round(results.energyWh || 0).toLocaleString("fr-FR")} Wh${weightDetail}</td><td>${money(itemPrice)}</td></tr>${shippingRow}</tbody>
        </table>
        <section class="totals">
          <div><h3>Paiement</h3><p>${escapeHtml(q.paymentTerms || "")}</p>${paypalUrl ? `<a class="paypal" href="${escapeHtml(paypalUrl)}" target="_blank" rel="noopener"><span class="paypal-mark"><span>Pay</span><span>Pal</span></span><span>Payer avec PayPal</span></a><p class="payment-url">Lien de paiement : ${escapeHtml(paypalUrl)}</p>` : ""}</div>
          <div class="total-box"><span>Total devis</span><strong>${money(totalPrice)}</strong><span>Acompte</span><strong>${money(depositAmount)} (${fixed(q.depositPercent)} %)</strong></div>
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

async function renderQuotePdf(quote) {
  const executablePath = await findChromiumExecutable();
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1600, deviceScaleFactor: 1 });
    await page.setContent(publicQuoteHtml(quote, { pdf: true }), { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    });
  } finally {
    await browser.close();
  }
}

function quoteFromBody(body) {
  return {
    id: "preview",
    createdAt: new Date().toISOString(),
    state: body.state || {},
    results: body.results || {},
    quote: body.quote || {},
    logoDataUrl: body.logoDataUrl || "",
    topSvg: body.topSvg || "",
  };
}

async function createQuote(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    if (!body.quote?.customerEmail) return jsonResponse(res, 400, { error: "Email client requis" });

    const id = crypto.randomBytes(12).toString("base64url");
    const quote = {
      ...quoteFromBody(body),
      id,
      createdAt: new Date().toISOString(),
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

async function createQuotePdf(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    const quote = quoteFromBody(body);
    const pdf = await renderQuotePdf(quote);
    const filename = `${(quote.quote?.number || "devis-batterielab").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.pdf`;
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  } catch (error) {
    jsonResponse(res, 500, { error: error.message || "Generation PDF impossible" });
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
  if (req.method === "POST" && url.pathname === "/api/quote-pdf") return createQuotePdf(req, res);
  if (req.method === "GET" && url.pathname.startsWith("/devis/")) return serveQuote(req, res, url.pathname.split("/").pop());
  if (req.method === "GET") return serveStatic(req, res);
  jsonResponse(res, 405, { error: "Method not allowed" });
});

server.listen(port, () => {
  console.log(`BatterieLab listening on :${port}`);
});
