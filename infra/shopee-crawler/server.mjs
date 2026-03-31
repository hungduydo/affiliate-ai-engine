import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

let browser = null;

const IS_DOCKER = process.env.IS_DOCKER === "1";

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      // In Docker: use playwright's bundled Chromium with xvfb virtual display.
      // Locally: use system Chrome (non-headless) to bypass Shopee's bot detection.
      ...(IS_DOCKER ? {} : { channel: "chrome" }),
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        ...(IS_DOCKER ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] : []),
      ],
    });
  }
  return browser;
}

async function crawl(url) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: "vi-VN",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait for the Schema.org JSON-LD product script to be injected
    await page.waitForFunction(
      () => [...document.querySelectorAll('script[type="application/ld+json"]')]
              .some(s => s.textContent.includes('"Product"')),
      { timeout: 15000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);

    return await page.evaluate(() => {
      // --- Price: from Schema.org JSON-LD (most reliable, always present) ---
      let price = null;
      let priceCurrency = null;
      try {
        const ldScripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
        const productScript = ldScripts.find((s) => s.textContent.includes('"Product"'));
        if (productScript) {
          const ld = JSON.parse(productScript.textContent);
          const rawPrice = parseFloat(ld.offers?.price);
          priceCurrency = ld.offers?.priceCurrency || "VND";
          if (!isNaN(rawPrice)) {
            price = rawPrice;
          }
        }
      } catch {}

      // --- Price fallback: read from rendered DOM if JSON-LD didn't have it ---
      if (!price) {
        const allBodyText = document.body.innerText;
        const domPriceMatch = allBodyText.match(/(\d[\d.]*\.?\d*)₫/);
        if (domPriceMatch) {
          const parsed = parseFloat(domPriceMatch[1].replace(/\./g, ""));
          if (!isNaN(parsed)) price = parsed;
        }
      }

      // --- Title + Description + Images: from initialState JSON ---
      const scripts = [...document.querySelectorAll("script")];
      const initScript = scripts.find((s) =>
        s.textContent.includes('"initialState"')
      );

      if (initScript) {
        try {
          const data = JSON.parse(initScript.textContent);
          const items = data.initialState?.item?.items || {};
          const key = Object.keys(items)[0];
          if (key) {
            const p = items[key];
            return {
              title: p.name || "",
              description: p.description || "",
              price,
              currency: priceCurrency || "VND",
              categories: (p.categories || []).map(c => c.display_name),
              images: (p.images || []).map(
                (id) => `https://down-vn.img.susercontent.com/file/${id}`
              ),
              videos: (p.video_info_list || [])
                .filter(v => v.video_url)
                .map(v => ({
                  url: v.video_url,
                  thumbnail_url: v.thumbnail || null,
                })),
              shop_id: p.shopid,
              item_id: p.itemid,
              rating_star: p.item_rating?.rating_star || null,
              rating_count: p.item_rating?.rating_count
                ? p.item_rating.rating_count.reduce((a, b) => a + b, 0)
                : null,
              source: "initialState+ld+json",
            };
          }
        } catch {}
      }

      // --- Fallback: DOM text ---
      const allText = document.body.innerText;
      const rawTitle = document.title || "";
      const title = rawTitle.replace(/\s*\|.*$/, "").trim();

      let description = "";
      const descMatch = allText.match(
        /MÔ TẢ SẢN PHẨM\s*([\s\S]*?)(?=ĐÁNH GIÁ SẢN PHẨM|$)/
      );
      if (descMatch) description = descMatch[1].trim();

      return { title, description, price, currency: priceCurrency || "VND", source: "dom" };
    });
  } finally {
    await context.close();
  }
}

// GET /api/product?url=https://shopee.vn/product/SHOP_ID/ITEM_ID
// GET /api/product?shop_id=890145377&item_id=58156791214
app.get("/api/product", async (req, res) => {
  try {
    let url = req.query.url;
    if (!url && req.query.shop_id && req.query.item_id) {
      url = `https://shopee.vn/product/${req.query.shop_id}/${req.query.item_id}`;
    }
    if (!url) {
      return res.status(400).json({ error: "Provide ?url= or ?shop_id=&item_id=" });
    }

    console.log(`[${new Date().toISOString()}] Crawling: ${url}`);
    const data = await crawl(url);
    res.json({ ok: true, data });
  } catch (err) {
    console.error("Crawl error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Shopee crawler API running on http://localhost:${PORT}`);
  console.log(`Usage: GET http://localhost:${PORT}/api/product?shop_id=890145377&item_id=58156791214`);
});

process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});
