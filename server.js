const express = require("express");
const cors = require("cors");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();

app.use(cors());

app.get("/fare", async (req, res) => {

  const from = req.query.from || "MAA";
  const to = req.query.to || "DXB";
  const date = req.query.date || "15/06/2026";

  let browser;

  try {

    browser = await puppeteer.launch({

      headless: true,

      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]

    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1366,
      height: 768
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    const url =
      `https://www.easemytrip.com/flights.html?origin=${from}&destination=${to}&deptDate=${date}&adults=1&child=0&infant=0&class=Economy`;

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await new Promise(resolve =>
      setTimeout(resolve, 7000)
    );

    const result = await page.evaluate(() => {

      const selectors = [
        ".txt-r4",
        ".price",
        "[class*=price]",
        ".fpr"
      ];

      let price = null;

      for (const sel of selectors) {

        const el = document.querySelector(sel);

        if (el) {

          let raw = el.innerText.trim();

          raw = raw.replace(/\n/g, " ");

          const match = raw.match(/\d[\d,]*/);

          if (match) {

            const amount =
              parseInt(match[0].replace(/,/g, ""));

            price =
              "₹" + amount.toLocaleString("en-IN");

          } else {

            price = raw;

          }

          break;

        }

      }

      return { price };

    });

    if (!result.price) {

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
      lowestFare: result.price,
      bookingUrl: url
    });

  } catch (err) {

    res.json({
      success: false,
      error: err.toString()
    });

  } finally {

    if (browser) {
      await browser.close();
    }

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
