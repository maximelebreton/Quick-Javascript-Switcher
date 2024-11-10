import { BootstrapContext } from "./bootstrap"


export async function evaluateFromExtensionWorker (context: BootstrapContext, callback:() => void) {

    await context.extensionWorker?.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        chrome.tabs.query({ active: true }, async (tabs) => {
          
          await callback()
          resolve()
        })
      })
    })
  
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