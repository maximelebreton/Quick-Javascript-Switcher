import { isValidPrimaryPattern } from "../options/computed";
import { clearJavascriptContentSettingsWithPromise, clearJavascriptRules, handleClear, reloadTab } from "./actions";
import { cl, isAllowedPattern, Log, sortUrlsByPatternPrecedence } from "./utils";
import { updateIcon } from "./icon";
import {
  getDomainStorageRulesFromUrl,
  getStorageRules,
  QJS,
  setStorageRule,
  unsetStorageRule,
} from "./storage";
import { getUrlAsObject, isValidScheme } from "./utils";
import { set } from "lodash";

export type RuleSetting = "allow" | "block";

export const getTabSetting = async (tab: chrome.tabs.Tab) => {
  const setting = await getJavascriptRuleSetting({
    primaryUrl: tab.url!,
    incognito: tab.incognito,
  });
  return setting;
};

export const getJavascriptRuleSetting = async ({
  primaryUrl,
  incognito,
}: {
  primaryUrl: string;
  incognito: boolean;
}) => {
  return new Promise<RuleSetting>((resolve, reject) => {
    chrome.contentSettings.javascript.get(
      {
        primaryUrl,
        incognito,
      },
      (details) => {
        cl('Current content setting:' + JSON.stringify(details), Log.RULES, 'CONTENT SETTINGS RULE: '+primaryUrl);
        resolve(details.setting);
      }
    );
  });
};


/*
export const removeConflictedRulesFromPattern = async (tabPattern: string) => {
  const { scheme: tabScheme, subdomain: tabSubdomain, domain: tabDomain, hostWithoutSubdomain: tabHost } = getUrlAsObject(tabPattern);

  const existingDomainRules = await getDomainStorageRulesFromUrl(tabPattern)
  //const existingDomainPatterns = Object.values(existingDomainRules).map(({primaryPattern}) => primaryPattern)
 // const sortedPatternsByPrecedence = sortUrlsByPatternPrecedence(existingDomainPatterns)
  
  Object.entries(existingDomainRules).forEach(async ([storagePattern, rule]) => {
    const { scheme: storageScheme, subdomain: storageSubdomain, domain: storageDomain, hostWithoutSubdomain: storageHost } = getUrlAsObject(storagePattern);
    cl({urlScheme: tabScheme, patternScheme: storageScheme, urlSubdomain: tabSubdomain, patternSubdomain: storageSubdomain, urlDomain: tabDomain, patternDomain: storageDomain, urlHost: tabHost, patternHost: storageHost}, Log.RULES, "Potential conflicted rules with: "+tabPattern)
    if (tabScheme !== storageScheme && tabSubdomain === storageSubdomain && tabHost === storageHost) {
      await removeJavascriptRuleIfExistInStorage(rule)
      cl(`Conflicted rule removed: ${storagePattern} (conflict with url: ${tabPattern})`, Log.RULES)
    } 
    if ((tabSubdomain === '*.' && storageSubdomain === '') && tabHost === storageHost) {
      await removeJavascriptRuleIfExistInStorage(rule)
      console.warn(`Conflicted rule removed: ${storagePattern} (conflict with url: ${tabPattern})`)
    }
  })

  //subdomain: `${scheme}${schemeSuffix}${subdomain}${domain}/*`,
}*/



export const setJavascriptRule = ({
  setting,
  primaryPattern,
  scope,
  tab,
}: {
  setting: QJS.ContentSettingRule["setting"];
  primaryPattern: QJS.ContentSettingRule["primaryPattern"];
  scope: QJS.ContentSettingRule["scope"];
  tab?: chrome.tabs.Tab;
}) => {
  return new Promise<void>(async (resolve, reject) => {
    const rule = {
      primaryPattern,
      setting,
      scope,
    };

    // console.log(isAllowedPattern(primaryPattern), "IS ALLOWED?");
    if (!isAllowedPattern(primaryPattern)) {
      return;
    }

    // if (setting === "allow") {
    //   await removeJavascriptRule(rule);
    // } else {
    //   await addJavascriptRule(rule);
    // }
    //await removeConflictedRulesFromPattern(rule.primaryPattern)

    await addJavascriptRule(rule);
    if (tab) {
      await updateIcon(tab); //not needed because we update tab
      reloadTab(tab);
    }
    resolve();
  });
};

export const clearJavascriptRule = ({
  primaryPattern,
  scope,
  tab,
}: {
  primaryPattern: QJS.ContentSettingRule["primaryPattern"];
  scope: QJS.ContentSettingRule["scope"];
  tab?: chrome.tabs.Tab;
}) => {

  return new Promise<void>(async (resolve, reject) => {
    const rule = {
      primaryPattern,
      scope,
    };

    if (!isAllowedPattern(primaryPattern)) {
      return;
    }

    await removeJavascriptRuleIfExistInStorage(rule);
    if (tab) {
      await updateIcon(tab); //not needed because we update tab
      reloadTab(tab);
    }
    resolve();
  });
}

export const addJavascriptRule = async (rule: QJS.ContentSettingRule) => {
  cl(rule, Log.RULES);
  return new Promise<void>(async (resolve, reject) => {
    console.log(chrome.contentSettings, "chrome.contentSettings");

    chrome.contentSettings.javascript.set(rule, async () => {
      console.info(
        `${rule.setting} ${rule.primaryPattern} rule added to content settings`
      );

      //@ts-expect-error
      if (chrome.runtime.lastError) {
        //@ts-expect-error
        console.error(chrome.runtime.lastError.message);
      } else {
        await setStorageRule(rule);
      }
      resolve();
    });
  });
};

export const rebaseJavascriptSettingsFromStorage = async () => {
  return new Promise<void>(async (resolve, reject) => {
    const storageRules = await getStorageRules();
    await clearJavascriptContentSettingsWithPromise();

    // Utiliser `for await...of` pour chaque règle dans storageRules
    for await (const [key, storageRule] of Object.entries(storageRules)) {
      await new Promise<void>((resolve) => {
        chrome.contentSettings.javascript.set(storageRule, () => resolve());
      });
    }

    console.info("Rebased settings from storage");
    resolve();
  });
};

export const setJavascriptContentSettingWithPromise = async <T extends {
  primaryPattern: string;
  secondaryPattern?: string;
  resourceIdentifier?: chrome.contentSettings.ResourceIdentifier;
  setting: any;
  scope?: chrome.contentSettings.Scope;
}>(value: T) => {
  return new Promise<void>(async (resolve, reject) => {
  chrome.contentSettings.javascript.set(value, () => {
      resolve()
    })
  })
}

export const removeJavascriptRuleIfExistInStorage = async (
  rule: Pick<QJS.ContentSettingRule, "primaryPattern" | "scope">
) => {
  return new Promise<void>(async (resolve, reject) => {
    const storageRules = await getStorageRules();
    console.log(rule.primaryPattern, 'removeJavascriptRule()')
    console.groupCollapsed()
    console.log(storageRules[rule.primaryPattern], "STORAGE RULE BEFORE");

    if (
      storageRules &&
      storageRules[rule.primaryPattern] &&
      storageRules[rule.primaryPattern].scope === rule.scope
    ) {
      delete storageRules[rule.primaryPattern];

      await clearJavascriptContentSettingsWithPromise();
      console.info(`${rule.primaryPattern} rule removed from content settings`);
      await unsetStorageRule(rule);

      console.log('Storage rules added to content settings:');

      // Remplacement de forEach par for...of pour gérer les promesses correctement
      for await (const [key, storageRule] of Object.entries(storageRules)) {
        await setJavascriptContentSettingWithPromise(storageRule);
        console.log(`${storageRule.setting}: ${storageRule.primaryPattern}`);
      }
      
      console.log('END Storage rules added to content settings:');
    }

    console.log(storageRules[rule.primaryPattern], "STORAGE RULE AFTER");
    console.groupEnd()
    resolve();
  });
};

export const searchRulesForTab = async (tab: chrome.tabs.Tab) => {
  const { subdomain, hostWithoutSubdomain } = getUrlAsObject(tab.url!);

  const rules = {
    subdomain: [
      `http://*.${hostWithoutSubdomain}/*`,
      `http://${subdomain}${hostWithoutSubdomain}/*`,
      `https://*.${hostWithoutSubdomain}/*`,
      `https://${subdomain}${hostWithoutSubdomain}/*`,
    ],
    domain: [`http://${hostWithoutSubdomain}/*`, `https://${hostWithoutSubdomain}/*`],
  };

  const subdomainPromises = rules.subdomain.map(async (url) => {
    const setting = await getJavascriptRuleSetting({
      primaryUrl: tab.url!,
      incognito: tab.incognito,
    });
    return [url, setting];
  });

  const domainPromises = rules.domain.map(async (url) => {
    const setting = await getJavascriptRuleSetting({
      primaryUrl: url,
      incognito: tab.incognito,
    });
    return [url, setting];
  });

  const subdomainRules = await Promise.all(subdomainPromises);
  const domainRules = await Promise.all(domainPromises);

  return {
    subdomain: subdomainRules,
    domain: domainRules,
  };
};

export const getSubdomainSetting = async (tab: chrome.tabs.Tab) => {
  const { subdomain } = await searchRulesForTab(tab);
  const hasSubdomainBlockedRules = subdomain.every(
    (rule) => rule[1] === "block"
  );

  return hasSubdomainBlockedRules ? "block" : "allow";
};
export const getDomainSetting = async (tab: chrome.tabs.Tab) => {
  const { domain } = await searchRulesForTab(tab);
  const hasDomainBlockedRules = domain.every((rule) => rule[1] === "block");

  return hasDomainBlockedRules ? "block" : "allow";
};
