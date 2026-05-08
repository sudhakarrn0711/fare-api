const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();

app.use(cors());

app.get("/fare", async (req, res) => {

  const from = (req.query.from || "MAA").toUpperCase();
  const to = (req.query.to || "DXB").toUpperCase();
  const date = req.query.date || "2026-05-15";

  let browser;

  try {

    browser = await chromium.launch({

      headless: true,

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

    console.log("Opening:", url);

await page.goto(url, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});

    // Wait extra time for dynamic fares
    await page.waitForTimeout(15000);

    // Capture all visible text
    const bodyText = await page.locator("body").innerText();

    // Find all ₹ prices
    const matches =
      [...bodyText.matchAll(/₹\s?([\d,]+)/g)];

    const fares = [];

    matches.forEach(match => {

      const amount =
        parseInt(
          match[1].replace(/,/g, "")
        );

      // Ignore unrealistic values
      if (
        amount > 1500 &&
        amount < 200000
      ) {
        fares.push(amount);
      }

    });

    // Remove duplicates
    const uniqueFares =
      [...new Set(fares)];

    if (!uniqueFares.length) {

      await browser.close();

      return res.json({
        success: false,
        error: "Fare not found"
      });

    }

    // Lowest fare
    const lowest =
      Math.min(...uniqueFares);

    await browser.close();

    res.json({
      success: true,
      from,
      to,
      date,
      lowestFare:
        "₹" +
        lowest.toLocaleString("en-IN"),
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
  console.log(
    `Server running on port ${PORT}`
  );
});
