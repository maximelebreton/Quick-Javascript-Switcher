import { CDPSession, Page } from 'puppeteer-core';
import bootstrap, {BootstrapContext} from "./bootstrap"
import { RuleSetting } from '@/entry/background/contentsettings';
import { handleToggleGlobal } from '@/entry/background/actions';
import {evaluateFromExtensionWorker, triggerActionClick} from "./utils"
jest.setTimeout(10000)


async function createCDPClient (page: Page) {
  const client: CDPSession = await page.createCDPSession();

  return client
}






async function getJavascriptContentSetting (context: BootstrapContext) {
 
  return await context.extensionWorker?.evaluate(() => {
    return new Promise<RuleSetting>((resolve, reject) => {
      chrome.tabs.query({ active: true }, async (tabs) => {
        
        //chrome.action.onClicked.dispatch(tabs[0]);
        const {setting} = await chrome.contentSettings.javascript.get({
          primaryUrl: tabs[0].url!,
          incognito: tabs[0].incognito
        })
        resolve(setting)
      })
    })
  })

}


async function testToggleWithUrl (context: BootstrapContext, url: string) {
  const page: Page = await context.browser.newPage();
  await page.bringToFront()

  await page.setRequestInterception(true);

  // Écouter chaque requête et l'annuler après un certain temps
  page.on('request', request => {
    // Ici, tu pourrais filtrer les requêtes par type ou URL
    // Par exemple : if (request.resourceType() === 'image') { request.abort(); }
    request.abort(); // Annule toutes les requêtes
  });


    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (err) {
      // Afficher l'erreur spécifique et continuer
      console.log("Erreur de connexion refusée, mais je continue...");
      
      await page.waitForNavigation({timeout: 500});

    }


    console.log(`BEFORE: ${url} content setting: `+await getJavascriptContentSetting(context))

    expect(await getJavascriptContentSetting(context)).toBe('allow');

    await triggerActionClick(context)

    try {
      await page.waitForNavigation({waitUntil: 'domcontentloaded'})
    } catch (err) {
      console.log("Erreur de connexion refusée, mais je continue...");
      await page.waitForNavigation({timeout: 500});
    }


    //await page.screenshot( {path: 'screenshot.jpg'})

  
    console.log(`AFTER: ${url} content setting: `+await getJavascriptContentSetting(context))

    expect(await getJavascriptContentSetting(context)).toBe('block');
    
    // remove toggle
    //await triggerActionClick(context)

    await page.close();
}



describe('When javascript is enabled, toggle should block sites', () => {
  let context : BootstrapContext

  // Avant tous les tests, on initialise le navigateur
  beforeAll(async () => {
    context = await bootstrap();
  });


  const urls = {
    domainOnly: 'https://maximelebreton.com',
    withSubdomain: 'https://gist.github.com',
    localIpWithoutPort: 'http://127.0.0.1',
    externalIpWithPort: 'http://10.10.1.1:3000/test',
    localhost: 'http://localhost:3000'
  }


  it('Should block content settings', async () => {
    
    for await (const [url] of Object.values(urls)) {
      
      await evaluateFromExtensionWorker(context, async () => await chrome.contentSettings.javascript.set({
        primaryPattern: url,
        scope: "regular",
        setting: 'block'
      }))
      
    }

    for await (const [url] of Object.values(urls)) {
      await evaluateFromExtensionWorker(context, async () => {

        const {setting} = await chrome.contentSettings.javascript.get({
          primaryUrl: url,
          incognito: false
        })
        console.log('setting: '+setting)
        expect(setting).toBe('block');
      })
    }


  });

  // // Test de la page GitHub
  // it('Domain only', async () => {
  //   const url = 'https://maximelebreton.com'
  //   await testToggleWithUrl(context, url)
  // });

  // it('Subdomain', async () => {
  //   const url = 'https://gist.github.com'
  //   await testToggleWithUrl(context, url)
  // });

  // it('Local ip address', async () => {
  //   const url = 'http://127.0.0.1'
  //   await testToggleWithUrl(context, url)
  // });
  
  // it('External ip address', async () => {
  //   const url = 'http://10.10.1.1:3000/test'
  //   await testToggleWithUrl(context, url)
  // });

  // it('Localhost', async () => {
  //   const url = 'http://localhost:3000'
  //   await testToggleWithUrl(context, url)
  // });



  // it('Should disable globally js', async () => {
  //   //@ts-expect-error
  //   await evaluateFromExtensionWorker(context, handleToggleGlobal)
  //   const url = 'https://github.com'
  //   await testToggleWithUrl(context, url)
      
  // })


  // Fermeture du navigateur après tous les tests
  afterAll(async () => {
    await context.browser.close();
  });
});

