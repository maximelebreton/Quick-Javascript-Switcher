import { CDPSession, Page } from 'puppeteer-core';
import bootstrap, {BootstrapContext} from "./bootstrap"
import { RuleSetting } from '@/entry/background/contentsettings';
import { handleToggleGlobal } from '@/entry/background/actions';
import {evaluateFromExtensionWorker, getActiveTab, getJavascriptContentSetting, setJavascriptContentSetting, triggerActionClick} from "./utils"
import { getDomainPatternFromUrl } from '@/entry/background/utils';
jest.setTimeout(10000)


async function createCDPClient (page: Page) {
  const client: CDPSession = await page.createCDPSession();

  return client
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

    const activeTab = await getActiveTab(context)
    const {setting: beforeSetting} = await getJavascriptContentSetting(context, {primaryUrl: activeTab?.url!, incognito: false})
    console.log(`BEFORE: ${url} content setting: `+beforeSetting)
    expect(['allow', 'block']).toContain(beforeSetting);

    await triggerActionClick(context)

    try {
      await page.waitForNavigation({waitUntil: 'domcontentloaded'})
    } catch (err) {
      console.log("Erreur de connexion refusée, mais je continue...");
      await page.waitForNavigation({timeout: 500});
    }


    //await page.screenshot( {path: 'screenshot.jpg'})

    const {setting: afterSetting} = await getJavascriptContentSetting(context, {primaryUrl: activeTab?.url!, incognito: false})

    console.log(`AFTER: ${url} content setting: `+afterSetting)

    
    try {
      if (beforeSetting === 'allow') {
        expect(afterSetting).toBe('block');
      }
      if (beforeSetting === 'block') {
        expect(afterSetting).toBe('allow');
      }
   } catch(e) {
      throw new Error(`Expected setting to be '${beforeSetting === 'allow' ? 'block'  : 'allow'}', but got '${afterSetting}' on ${url}`)
    }
    
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
    externalIpWithPort: 'http://10.10.1.1:3000',
    localhost: 'http://localhost:3000',
  }


  it('Should toggle content settings', async () => {
    
    for await (const url of Object.values(urls)) {
      
      const {setting: startSetting} = await getJavascriptContentSetting(context, {primaryUrl: url, incognito: false})
      expect(startSetting).toBe('allow' as RuleSetting);

      await setJavascriptContentSetting(context, {primaryPattern: url+'/*', setting: 'block' as RuleSetting, 'scope': 'regular'});
      const {setting: beforeSetting} = await getJavascriptContentSetting(context, {primaryUrl: url, incognito: false})
      expect(beforeSetting).toBe('block' as RuleSetting);
      await testToggleWithUrl(context, url)
      const {setting: afterSetting} = await getJavascriptContentSetting(context, {primaryUrl: url, incognito: false})
      expect(afterSetting).toBe('allow' as RuleSetting);
      
    }

      await testToggleWithUrl(context, 'file:///C:/Users/Public/index.html')

    // for await (const url of Object.values(urls)) {
    //   console.log(url, 'URL')
    //   const {setting} = await getJavascriptContentSetting(context, {primaryUrl: url, incognito: false})
    //   expect(setting).toBe('block' as RuleSetting);
    // }


  });

  // // Test de la page GitHub
  // it('Domain only', async () => {
  //   //const url = 'https://maximelebreton.com'
  //   await testToggleWithUrl(context, urls.domainOnly)
  // });

  // it('Subdomain', async () => {
  //   //const url = 'https://gist.github.com'
  //   await testToggleWithUrl(context,  urls.withSubdomain)
  // });

  // it('Local ip address', async () => {
  //   //const url = 'http://127.0.0.1'
  //   await testToggleWithUrl(context, urls.localIpWithoutPort)
  // });
  
  // it('External ip address', async () => {
  //   //const url = 'http://10.10.1.1:3000/test'
  //   await testToggleWithUrl(context, urls.externalIpWithPort)
  // });

  // it('Localhost', async () => {
  //   const url = 'http://localhost:3000'
  //   await testToggleWithUrl(context, urls.localhost)
  // });



  // it('Should disable globally js', async () => {
  //   //@ts-expect-error
  //   await evaluateFromExtensionWorker(context, handleToggleGlobal)
  //   const url = 'https://github.com'
  //   await testToggleWithUrl(context, url)
      
  // })


  // Fermeture du navigateur après tous les tests
  afterAll(async () => {
    //await context.browser.close();
  });
});

