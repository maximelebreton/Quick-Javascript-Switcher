import { isPausedTab } from "./state";
import { getActiveTab } from "./tabs";
import {
  handleAllowDomain,
  handleAllowSubdomain,
  handleAllowUrl,
  handleBlockDomain,
  handleBlockSubdomain,
  handleBlockUrl,
  handleClear as handleClearContentSettings,
  handleClearDomain,
  handleClearStorage,
  handleClearSubdomain,
  handleOpenChromeSettings,
  handleOpenLinkWithJSDisabled,
  handleOpenPopup,
  handleOpenShortcut,
  handlePause,
  handlePlayPause,
  handleToggleGlobal,
} from "./actions";
import {
  cl,
  getDomainPatternFromUrl,
  getScopeSetting,
  getSubdomainPatternFromUrl,
  getUrlAsObject,
  getUrlPatternFromUrl,
  isAllowedUrl,
  Log,
} from "./utils";
import {
  getDomainSetting,
  getJavascriptRuleSetting,
  getSubdomainSetting,
  getTabSetting,
} from "./contentsettings";
import { getStorageRules } from "./storage";
import { ACTION_SHORTCUT_NAME } from "./constants";

export enum ContextMenus {
  TOGGLE_GLOBAL = "TOGGLE_GLOBAL",
  PLAY_PAUSE = "PLAY_PAUSE",
  BLOCK_SUBDOMAIN = "BLOCK_SUBDOMAIN",
  BLOCK_DOMAIN = "BLOCK_DOMAIN",
  BLOCK_URL = "BLOCK_URL",
  BLOCK = "BLOCK",
  ALLOW = "ALLOW",
  ALLOW_SUBDOMAIN = "ALLOW_SUBDOMAIN",
  ALLOW_DOMAIN = "ALLOW_DOMAIN",
  ALLOW_URL = "ALLOW_URL",
  CLEAR_CONTENT_SETTINGS = "CLEAR_CONTENT_SETTINGS",
  CLEAR_DOMAIN = "CLEAR_DOMAIN",
  CLEAR_SUBDOMAIN = "CLEAR_SUBDOMAIN",
  CLEAR_STORAGE = "CLEAR_STORAGE",
  SUBDOMAIN = "SUBDOMAIN",
  DOMAIN = "DOMAIN",
  MORE = "MORE",
  CHROME_SETTINGS = "CHROME_SETTINGS",
  OPEN_POPUP = "OPEN_POPUP",
  SUPPORT = "SUPPORT",
  SHORTCUT = "SHORTCUT",
  DANGER_ZONE = "DANGER_ZONE",
  OPEN_LINK_WITH_JS_DISABLED = "OPEN_LINK_WITH_JS_DISABLED",
  RIGHT_CLICK_MENU = "RIGHT_CLICK_MENU",
}

const DEFAULT_CONTEXT: [
  chrome.contextMenus.ContextType,
  ...chrome.contextMenus.ContextType[]
] = ["action", "audio", "frame", "image", "page", "video"];

const MORE_CONTEXT: [
  chrome.contextMenus.ContextType,
  ...chrome.contextMenus.ContextType[]
] = DEFAULT_CONTEXT;

const SETTINGS_CONTEXT: [
  chrome.contextMenus.ContextType,
  ...chrome.contextMenus.ContextType[]
] = DEFAULT_CONTEXT;

const titles = {
  [ContextMenus.TOGGLE_GLOBAL]: "Toggle global",
  [ContextMenus.PLAY_PAUSE]: "Pause JavaScript",
  [ContextMenus.BLOCK]: "Block",
  [ContextMenus.BLOCK_SUBDOMAIN]: "Block subdomain",
  [ContextMenus.BLOCK_DOMAIN]: "Block domain",
  [ContextMenus.BLOCK_URL]: "Block url",
  [ContextMenus.ALLOW]: "Allow",
  [ContextMenus.ALLOW_SUBDOMAIN]: "Allow subdomain",
  [ContextMenus.ALLOW_DOMAIN]: "Allow domain",
  [ContextMenus.ALLOW_URL]: "Allow url",
  [ContextMenus.CLEAR_CONTENT_SETTINGS]: "⚠️ Clear all rules",
  [ContextMenus.CLEAR_DOMAIN]: "Clear domain",
  [ContextMenus.CLEAR_SUBDOMAIN]: "Clear subdomain",
  [ContextMenus.CLEAR_STORAGE]: "Clear storage",
  [ContextMenus.SUBDOMAIN]: "Subdomain",
  [ContextMenus.DOMAIN]: "Domain",
  [ContextMenus.MORE]: "More...",
  [ContextMenus.CHROME_SETTINGS]: "Open Chrome settings",
  [ContextMenus.OPEN_POPUP]: "Open popup",
  [ContextMenus.SUPPORT]: "💖 Support my work (donate)",
  [ContextMenus.SHORTCUT]: "Shortcut",
  [ContextMenus.DANGER_ZONE]: "Danger zone",
  [ContextMenus.OPEN_LINK_WITH_JS_DISABLED]:
    "Open link with JavaScript disabled",
  [ContextMenus.RIGHT_CLICK_MENU]: "Quick Javascript Switcher",
};

const dynamicTitles: { [key: string]: { [key: string]: string } } = {
  [ContextMenus.SUBDOMAIN]: {
    allow: "✓ Allowed subdomain",
    block: "🗙 Blocked subdomain",
  },
  [ContextMenus.DOMAIN]: {
    allow: "✓ Allowed domain",
    block: "🗙 Blocked domain",
  },
};

export const getContextMenuTitle = (id: ContextMenus) =>
  titles[ContextMenus[id]];

export const initContextMenus = () => {
  chrome.contextMenus.removeAll(() => {
    createContextMenus();
  });
};

export const addContextMenu = ({
  id,
  parentId,
  dynamicTitle,
  contexts = DEFAULT_CONTEXT,
}: {
  id: ContextMenus;
  parentId?: ContextMenus;
  dynamicTitle?: boolean;
  contexts?: [
    chrome.contextMenus.ContextType,
    ...chrome.contextMenus.ContextType[]
  ];
}) => {
  // await updateState({
  //   contextMenus: {
  //     [id]: ,
  //   },
  // });
  chrome.contextMenus.create({
    id: id,
    title: dynamicTitle ? dynamicTitles[id].allow : titles[id],
    type: "normal",
    contexts,
    parentId,
  });
};

export const createContextMenus = () => {
  // REMOVED BECAUSE NEEDS DEBUGGER PERMISSION AND USERS AREN'T OKAY WITH THIS
  //addContextMenu({ id: ContextMenus.PLAY_PAUSE });


  // For Next 2.2.0 version
  // addContextMenu({
  //   id: ContextMenus.TOGGLE_GLOBAL
  // })

  // ALLOW
  // addContextMenu({
  //   id: ContextMenus.ALLOW,
  // });
  // BLOCK
  // addContextMenu({
  //   id: ContextMenus.BLOCK,
  // });
  addContextMenu({
    id: ContextMenus.SUBDOMAIN,
  });

  addContextMenu({
    id: ContextMenus.DOMAIN,
  });

  addContextMenu({
    id: ContextMenus.ALLOW_SUBDOMAIN,
    parentId: ContextMenus.SUBDOMAIN,
  });

  addContextMenu({
    id: ContextMenus.ALLOW_DOMAIN,
    parentId: ContextMenus.DOMAIN,
  });

  addContextMenu({
    id: ContextMenus.BLOCK_SUBDOMAIN,
    parentId: ContextMenus.SUBDOMAIN,
  });

  addContextMenu({
    id: ContextMenus.BLOCK_DOMAIN,
    parentId: ContextMenus.DOMAIN,
  });

  addContextMenu({
    id: ContextMenus.CLEAR_SUBDOMAIN,
    parentId: ContextMenus.SUBDOMAIN,
  });

  addContextMenu({
    id: ContextMenus.CLEAR_DOMAIN,
    parentId: ContextMenus.DOMAIN,
  });

  // state.contextMenus[ContextMenus.ALLOW_URL] = chrome.contextMenus.create({
  //     "id": ContextMenus.ALLOW_URL,
  //     "title": titles[ContextMenus.ALLOW_URL],
  //     "type": "normal",
  //     "contexts": CONTEXTS,
  //     "parentId": ContextMenus.ALLOW
  // })

  // state.contextMenus["separator-2"] = chrome.contextMenus.create({
  //   id: "separator-2",
  //   type: "separator",
  //   contexts: CONTEXTS,
  // });

  // updateState({
  //   contextMenus: {
  //     "separator-1": ,
  //     [ContextMenus.MORE]: ,
  //   },
  // });
  chrome.contextMenus.create({
    id: "separator-1",
    type: "separator",
    contexts: MORE_CONTEXT,
  });

  chrome.contextMenus.create({
    id: ContextMenus.MORE,
    title: titles[ContextMenus.MORE],
    type: "normal",
    contexts: MORE_CONTEXT,
  });

  addContextMenu({
    id: ContextMenus.SHORTCUT,
    parentId: ContextMenus.MORE,
    contexts: MORE_CONTEXT,
  });

  // await updateState({
  //   contextMenus: {
  //     [ContextMenus.CHROME_SETTINGS]: ,
  //   },
  // });

  chrome.contextMenus.create({
    id: ContextMenus.CHROME_SETTINGS,
    title: titles[ContextMenus.CHROME_SETTINGS],
    type: "normal",
    contexts: SETTINGS_CONTEXT,
    parentId: ContextMenus.MORE,
  });

  addContextMenu({
    id: ContextMenus.DANGER_ZONE,
    parentId: ContextMenus.MORE,
    contexts: SETTINGS_CONTEXT,
  });

  addContextMenu({
    id: ContextMenus.CLEAR_CONTENT_SETTINGS,
    parentId: ContextMenus.DANGER_ZONE,
    contexts: SETTINGS_CONTEXT,
  });

  // state.contextMenus[ContextMenus.CLEAR_STORAGE] = chrome.contextMenus.create({
  //   id: ContextMenus.CLEAR_STORAGE,
  //   title: titles[ContextMenus.CLEAR_STORAGE],
  //   type: "normal",
  //   contexts: CONTEXTS,
  //   parentId: ContextMenus.MORE,
  // });

  // state.contextMenus[ContextMenus.OPEN_POPUP] = chrome.contextMenus.create({
  //   id: ContextMenus.OPEN_POPUP,
  //   title: titles[ContextMenus.OPEN_POPUP],
  //   type: "normal",
  //   contexts: CONTEXTS,
  //   parentId: ContextMenus.MORE,
  // });

  //  updateState({
  //   contextMenus: {
  //     [ContextMenus.CHROME_SETTINGS]: ,
  //   },
  // });
  chrome.contextMenus.create({
    id: ContextMenus.SUPPORT,
    title: titles[ContextMenus.SUPPORT],
    type: "normal",
    contexts: SETTINGS_CONTEXT,
  });

  chrome.contextMenus.create({
    id: ContextMenus.OPEN_LINK_WITH_JS_DISABLED,
    title: titles[ContextMenus.OPEN_LINK_WITH_JS_DISABLED],
    type: "normal",
    contexts: ["link"],
  });

  // state.contextMenus.separator = chrome.contextMenus.create({
  //     "type": "separator",
  //     "contexts": CONTEXTS
  //   });

  //   state.contextMenus.main = chrome.contextMenus.create({
  //     "id": "euh",
  //     "title": "Go ok JavaScript settings",
  //     "type": "normal",
  //     "contexts": CONTEXTS
  //   }, () => {
  //       console.log('created')
  //       console.log(state.contextMenus)

  //   })
};

// export const updateClearContextMenus = async (tab: chrome.tabs.Tab) => {

//     const ruleSetting = await getJavascriptRuleSetting({
//         primaryUrl: tab.url!,
//         incognito: tab.incognito
//     })

//     console.log(ruleSetting + " " + tab.url, "hey")

// }
export const updateSubdomainContextMenu = async (tab: chrome.tabs.Tab) => {
  // const subdomainPattern = parsedUrl.subdomain && parsedUrl.domain ? `${parsedUrl.subdomain}.${parsedUrl.domain}/*` : null
  const { subdomain } = getUrlAsObject(tab.url!);
  const subdomainPattern = getSubdomainPatternFromUrl(tab.url!);
  // BLOCK_SUBDOMAIN
  const subdomainTitle = `${getContextMenuTitle(ContextMenus.SUBDOMAIN)} ${
    subdomain ? ` (${subdomainPattern})` : ""
  }`;

  chrome.contextMenus.update(ContextMenus.SUBDOMAIN, {
    title: subdomainTitle,
    enabled: subdomain && isAllowedUrl(tab.url!) ? true : false,
  });

  chrome.contextMenus.update(ContextMenus.BLOCK_SUBDOMAIN, {
    enabled: subdomain && isAllowedUrl(tab.url!) ? true : false,
  });

  // ALLOW_SUBDOMAIN
  chrome.contextMenus.update(ContextMenus.ALLOW_SUBDOMAIN, {
    enabled: subdomain && isAllowedUrl(tab.url!) ? true : false,
  });

  // CLEAR_SUBDOMAIN
  chrome.contextMenus.update(ContextMenus.CLEAR_SUBDOMAIN, {
    enabled: subdomain && isAllowedUrl(tab.url!) ? true : false,
  });

  // const setting = await getSubdomainSetting(tab);

  // ALLOW_SUBDOMAIN
  // chrome.contextMenus.update(ContextMenus.SUBDOMAIN, {
  //   title: `${dynamicTitles[ContextMenus.SUBDOMAIN][setting]}${
  //     subdomain ? ` (${subdomainPattern})` : ""
  //   }`,
  //   enabled: subdomain && isAllowedUrl(tab.url!) ? true : false,
  // });

  return Promise.resolve();
};

export const updateDomainContextMenu = async (tab: chrome.tabs.Tab) => {
  // const domainPattern = parsedUrl.domain ? `*.${parsedUrl.domain}/*` : null
  const domainPattern = getDomainPatternFromUrl(tab.url!);

  const domainTitle = `${getContextMenuTitle(ContextMenus.DOMAIN)} ${
    domainPattern && isAllowedUrl(tab.url!) ? ` (${domainPattern})` : ""
  }`;

  chrome.contextMenus.update(ContextMenus.DOMAIN, {
    title: domainTitle,
    enabled: domainPattern && isAllowedUrl(tab.url!) ? true : false,
  });
  // BLOCK DOMAIN
  chrome.contextMenus.update(ContextMenus.BLOCK_DOMAIN, {
    enabled: domainPattern && isAllowedUrl(tab.url!) ? true : false,
  });
  // ALLOW DOMAIN
  chrome.contextMenus.update(ContextMenus.ALLOW_DOMAIN, {
    enabled: domainPattern && isAllowedUrl(tab.url!) ? true : false,
  });
  // CLEAR DOMAIN
  chrome.contextMenus.update(ContextMenus.CLEAR_DOMAIN, {
    enabled: domainPattern && isAllowedUrl(tab.url!) ? true : false,
  });

  // const setting = await getDomainSetting(tab);

  // chrome.contextMenus.update(ContextMenus.DOMAIN, {
  //   title: `${dynamicTitles[ContextMenus.DOMAIN][setting]}${
  //     domainPattern ? ` (${domainPattern})` : ""
  //   }`,
  //   enabled: domainPattern && isAllowedUrl(tab.url!) ? true : false,
  // });

  return Promise.resolve();
};

export const updatePlayPauseContextMenu = async (tab: chrome.tabs.Tab) => {
  const PLAY = "Play JS (no refresh)";
  const PAUSE = "Pause JS (no refresh)";
  chrome.contextMenus.update(
    ContextMenus.PLAY_PAUSE,
    {
      title: (await isPausedTab(tab)) ? PLAY : PAUSE,
      enabled: isAllowedUrl(tab.url!) ? true : false,
    },
    () => {
      return Promise.resolve();
    }
  );
};

// export const updateUrlContextMenu = async (tab: chrome.tabs.Tab) => {

//     // const urlPattern = new URL(activeTab.url).pathname ? new URL(activeTab.url).pathname : null
//     const urlPattern = getUrlPatternFromUrl(tab.url!)
//     const urlPathname = new URL(tab.url!).pathname ? new URL(tab.url!).pathname : null

//     // const urlTitle = `${getContextMenuTitle(ContextMenus.BLOCK_URL)} ${urlPathname ? `(${urlPathname === "/" ? urlPattern : `...${urlPathname}`})` : ''}`
//     const urlTitle = `${getContextMenuTitle(ContextMenus.BLOCK_URL)} ${urlPattern ? `(${urlPattern})` : ''}`

//     // BLOCK URL
//     chrome.contextMenus.update(ContextMenus.BLOCK_URL, {
//         "title": urlTitle,
//         enabled: urlPattern ? true : false
//     });
// }

export const updateSupportMenu = async () => {
  return Promise.resolve();
};

export const updateContextMenus = async () => {
  cl("Start update context menus", Log.CONTEXT_MENUS);

  const activeTab = await getActiveTab();
  cl("Ok for active Tab", Log.CONTEXT_MENUS);
  if (activeTab && activeTab.url) {
    await updateSubdomainContextMenu(activeTab);
    await updateDomainContextMenu(activeTab);
    // REMOVED BECAUSE NEEDS DEBUGGER PERMISSION AND USERS AREN'T OKAY WITH THIS
    //await updatePlayPauseContextMenu(activeTab);
    await updateSupportMenu();

    chrome.contextMenus.update(ContextMenus.SHORTCUT, {
      title: `Shortcut: ${await getDefaultShortcut()}`,
    });

    // updateClearContextMenus(activeTab)
    // updateUrlContextMenu(activeTab)
  }
  cl("Ok for updates, launch resolve", Log.CONTEXT_MENUS);
  return Promise.resolve();
};

export const getDefaultShortcut = async () => {
  return new Promise((resolve, reject) => {
    chrome.commands.getAll((commands) => {
      //console.info(commands, "commands");
      const shortcut =
        commands.find(
          // (command) => command.name === "_execute_bowser_action"
          (command) => command.name === ACTION_SHORTCUT_NAME
        )?.shortcut || "";
      resolve(shortcut);
    });
  });
};

export const handleContextMenu = (
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab
) => {
  switch (info.menuItemId) {
    case ContextMenus.TOGGLE_GLOBAL:
      handleToggleGlobal(tab);
      break;
    case ContextMenus.PLAY_PAUSE:
      handlePlayPause(tab);
      break;
    case ContextMenus.BLOCK_SUBDOMAIN:
      handleBlockSubdomain(tab);
      break;
    case ContextMenus.BLOCK_DOMAIN:
      handleBlockDomain(tab);
      break;
    // case ContextMenus.BLOCK_URL:
    //     handleBlockUrl(tab)
    //     break;
    case ContextMenus.ALLOW_SUBDOMAIN:
      handleAllowSubdomain(tab);
      break;
    case ContextMenus.ALLOW_DOMAIN:
      handleAllowDomain(tab);
      break;
    case ContextMenus.CLEAR_CONTENT_SETTINGS:
      handleClearContentSettings();
      break;
    case ContextMenus.CLEAR_SUBDOMAIN:
      handleClearSubdomain(tab);
      break;
    case ContextMenus.CLEAR_DOMAIN:
      handleClearDomain(tab);
      break;
    case ContextMenus.CLEAR_STORAGE:
      handleClearStorage();
      break;
    case ContextMenus.SUPPORT:
      handleOpenPopup(tab);
      break;
    case ContextMenus.SHORTCUT:
      handleOpenShortcut();
      break;
    case ContextMenus.CHROME_SETTINGS:
      handleOpenChromeSettings();
      break;
    case ContextMenus.OPEN_LINK_WITH_JS_DISABLED:
      handleOpenLinkWithJSDisabled(tab, info);

      break;
    // case ContextMenus.ALLOW_URL:
    //   handleAllowUrl(tab);
    //   break;
    default:
      console.log(info);
  }
};
