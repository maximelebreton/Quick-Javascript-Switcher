import puppeteer from 'puppeteer-core';

async function bootstrap(options = {}) {
  //@ts-ignore
  const { devtools = false, slowMo = false, appUrl } = options;
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Users\\Maxime\\Documents\\Work\\qjs\\chrome\\win64-130.0.6723.93\\chrome-win64\\chrome.exe',
    devtools,
    args: [
      '--disable-extensions-except=../../../dist',
      '--load-extension=../../../dist',
    ],
    ...(slowMo && { slowMo }),
  });

const extensionBackgroundTarget = await browser.waitForTarget(t => t.type() === 'service_worker');
const extensionWorker = await extensionBackgroundTarget.worker();

  // const targets = await browser.targets();
  // //@ts-ignore
  // const extensionTarget = targets.find((target) => target.type() === 'service_worker');
  // console.log(targets,"TARGETS")
  // //@ts-ignore
  // const partialExtensionUrl = extensionTarget.url() || '';
  // const [, , extensionId] = partialExtensionUrl.split('/');

  const extensionId = 'fgeohkmkdhoogaepdjbjamkahnobeelp'
  
  // const extensionPopupPage = await browser.newPage();
  // const extensionPopupUrl = `chrome-extension://${extensionId}/popup.html`;
  // await extensionPopupPage.goto(extensionPopupUrl, { waitUntil: 'load' });

  return {
    browser,
    //extensionPopupUrl,
    extensionId,
    //extensionPopupPage,
    extensionWorker
  };
}

export default bootstrap;

//@ts-ignore
export type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>