const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();

app.use(cors());

app.get("/fare", async (req, res) => {

  const from = req.query.from || "MAA";
  const to = req.query.to || "DXB";
  const date = req.query.date || "15/06/2026";

  let browser;

  try {

browser = await chromium.launch({

  headless: true,

  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,

  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
  ]

});
    
    const page = await browser.newPage({

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

    });

    const url =
      `https://www.easemytrip.com/flights.html?origin=${from}&destination=${to}&deptDate=${date}&adults=1&child=0&infant=0&class=Economy`;

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(10000);

    const price = await page.evaluate(() => {

      const selectors = [
        ".txt-r4",
        ".price",
        "[class*=price]",
        ".fpr",
        ".srp-card__price"
      ];

      for (const sel of selectors) {

        const el = document.querySelector(sel);

        if (el) {

          let raw = el.innerText.trim();

          raw = raw.replace(/\n/g, " ");

          const match = raw.match(/\d[\d,]*/);

          if (match) {

            const amount =
              parseInt(match[0].replace(/,/g, ""));

            return "₹" + amount.toLocaleString("en-IN");

          }

          return raw;

        }

      }

      return null;

    });

    await browser.close();

    if (!price) {

      return res.json({
        success: false,
        error: "Fare not found"
      });

    }

    res.json({
      success: true,
      from,
      to,
      date,
      lowestFare: price,
      bookingUrl: url
    });

  } catch (err) {

    if (browser) {
      await browser.close();
    }

    res.json({
      success: false,
      error: err.toString()
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
