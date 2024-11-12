import { BootstrapContext } from "./bootstrap"



// export async function evaluateFromExtensionWorker (context: BootstrapContext, callback:() => void) {

//     await context.extensionWorker?.evaluate(() => {
//       return new Promise<void>((resolve, reject) => {
//         chrome.tabs.query({ active: true }, async (tabs) => {
          
//           await callback()
//           resolve()
//         })
//       })
//     })
  
//   }
  
// export async function evaluateFromExtensionWorker(context: BootstrapContext, callback: (tab: chrome.tabs.Tab) => Promise<void>): Promise<void> {
//   try {
    
//     // Utilisation de context.extensionWorker.evaluate avec une promesse
//     await context.extensionWorker?.evaluate(() => {
//       return new Promise<void>(async (resolve, reject) => {
//         try {
          
//           chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
//             //@ts-expect-error
//             if (chrome.runtime.lastError) {
//               //@ts-expect-error
//               reject(chrome.runtime.lastError);
//             } else if (tabs.length === 0) {
//               reject(new Error("Aucun onglet actif trouvé"));
//             } else {

//               const tab = tabs[0]
//               // Exécution du callback avec l'onglet récupéré
//               await callback(tab);
//               resolve();
//             }
//           });

//         } catch (error) {
//           console.error("Erreur dans evaluate:", error);
//           reject(error);
//         }
//       });
//     });
//   } catch (error) {
//     console.error("Erreur lors de l'exécution avec l'onglet:", error);
//   }
// }


export async function getActiveTab(
  context: BootstrapContext
){
  try {
    // Obtenez l'onglet actif dans le contexte Puppeteer
    return await context.extensionWorker?.evaluate(() => {
      return new Promise<chrome.tabs.Tab>((resolve, reject) => {
        chrome.tabs.query({ active: true }, (tabs) => {
          //@ts-ignore
          if (chrome.runtime.lastError) {
            //@ts-ignore
            reject(chrome.runtime.lastError);
          } else if (tabs.length === 0) {
            reject(new Error("Aucun onglet actif trouvé"));
          } else {
            const tab = tabs[0]
            resolve(tab); // Renvoie les informations de l'onglet actif
          }
        });
      });
    });

  } catch (error) {
    console.error("Erreur lors de l'exécution de getActiveTab:", error);
  }
}


export async function getJavascriptContentSetting(
  context: BootstrapContext, args: Parameters<typeof chrome.contentSettings.javascript.get>[0]
){
  //@ts-expect-error
  type JavascriptContentSettingDetails = Parameters<Parameters<typeof chrome.contentSettings.javascript.get>[1]>[0];


    // Obtenez l'onglet actif dans le contexte Puppeteer
    //@ts-ignore
    return await context.extensionWorker!.evaluate(async (settingArgs) => {
      console.log(settingArgs, "args")
        return await chrome.contentSettings.javascript.get(settingArgs)
    }, args);

}

export async function setJavascriptContentSetting(
  context: BootstrapContext, args: Parameters<typeof chrome.contentSettings.javascript.set>[0]
){
    // Obtenez l'onglet actif dans le contexte Puppeteer
    console.log(args, "ARGSSSSSSSSSSSSS")
    //@ts-ignore
    return await context.extensionWorker!.evaluate(async (settingArgs) => {
      return await chrome.contentSettings.javascript.set(settingArgs)
    }, args);


}
  
export async function evaluateFromExtensionWorker(
  context: BootstrapContext,
  callback: (tab: chrome.tabs.Tab) => Promise<void>
): Promise<void> {
  try {
    // Obtenez l'onglet actif dans le contexte Puppeteer
    const tabInfo = await context.extensionWorker?.evaluate(() => {
      return new Promise<chrome.tabs.Tab>((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          //@ts-ignore
          if (chrome.runtime.lastError) {
            //@ts-ignore
            reject(chrome.runtime.lastError);
          } else if (tabs.length === 0) {
            reject(new Error("Aucun onglet actif trouvé"));
          } else {
            const tab = tabs[0]
            chrome.contentSettings.javascript.set({
              primaryPattern: tab.url!,
              scope: "regular",
              setting: "block"
            });
            resolve(tab); // Renvoie les informations de l'onglet actif
          }
        });
      });
    });

    if (tabInfo) {
      // Exécution du callback avec l'onglet récupéré dans le contexte de l'extension
      await callback(tabInfo);
    }
    
  } catch (error) {
    console.error("Erreur lors de l'exécution dans evaluateFromExtensionWorker:", error);
  }
}
  
  
 export async function triggerActionClick (context: BootstrapContext) {
  
    await context.extensionWorker?.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        chrome.tabs.query({ active: true }, tabs => {
          //@ts-expect-error
          chrome.action.onClicked.dispatch(tabs[0]);
          resolve()
        })
      })
    })
  
  }