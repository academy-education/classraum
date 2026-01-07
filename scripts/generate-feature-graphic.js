const puppeteer = require('puppeteer');
const path = require('path');

async function generateFeatureGraphic() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set viewport to match feature graphic size
  await page.setViewport({ width: 1024, height: 500 });

  // Load the HTML file
  const htmlPath = path.join(__dirname, '..', 'feature-graphic.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  // Get the feature graphic element
  const element = await page.$('.feature-graphic');

  // Take screenshot of just the element
  await element.screenshot({
    path: path.join(__dirname, '..', 'feature-graphic-new.png'),
    type: 'png'
  });

  console.log('Feature graphic saved to feature-graphic-new.png');

  await browser.close();
}

generateFeatureGraphic().catch(console.error);
