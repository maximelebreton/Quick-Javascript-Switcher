import { parse } from "tldts";
import { getJavascriptRuleSetting } from "./contentsettings";

export enum Log {
  EVENTS = "EVENTS",
  TABS = "TABS",
  RULES = "RULES",
  STORAGE = "STORAGE",
  ACTIONS = "ACTIONS",
  ICON = "ICON",
  CONTEXT_MENUS = "CONTEXT_MENUS",
}

export type PatternScheme =  'http' | 'https' | 'file' | '*'
export type PatternSchemeSuffix =  '://' | ':///'


export const cl = (message: any, type?: Log, name?: string) => {
  const DEBUG = {
    [Log.ACTIONS]: false,
    [Log.TABS]: false,
    [Log.RULES]: false,
    [Log.STORAGE]: false,
    [Log.EVENTS]: false,
    [Log.ICON]: false,
    [Log.CONTEXT_MENUS]: false,
  };

  if (type && DEBUG[type] === true) {
    console.log(message, name);
  }
  if (!type) {
    console.log(message, name);
  }
};

export const getUrlPatterns = (url: string) => {
  const { scheme, schemeSuffix, subdomain, domain, path, hostWithoutSubdomain } = getUrlAsObject(url);

  const patterns = {
    subdomain: `${scheme}${schemeSuffix}${subdomain}${hostWithoutSubdomain}/*`,
    domain: `${scheme}${schemeSuffix}*.${hostWithoutSubdomain}/*`,
  };
  return patterns;
};

// export const getPrecedenceFromTab = async (tab: chrome.tabs.Tab) => {
//   const patterns = getUrlPatterns(tab.url!);

//   const subdomainSetting = await getJavascriptRuleSetting({
//     primaryUrl: patterns.subdomain,
//     incognito: tab.incognito,
//   });

//   const domainSetting = await getJavascriptRuleSetting({
//     primaryUrl: patterns.domain,
//     incognito: tab.incognito,
//   });

//   let precedence;
//   if (subdomainSetting === domainSetting) {
//     precedence = {
//       type: "subdomain",
//       url: patterns.subdomain,
//       setting: subdomainSetting,
//     };
//   } else {
//     precedence = {
//       type: "domain",
//       url: patterns.domain,
//       setting: domainSetting,
//     };
//   }

//   return precedence;
// };

export function canHaveWildcard(url: string): boolean {
  const { hostname, scheme } = getUrlAsObject(url);

  // Supprimer le port si présent dans le hostname (format host:port)
  const hostnameWithoutPort = hostname.split(":")[0];

  // Vérifier si le hostname sans port est une adresse IPv4
  const isIPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostnameWithoutPort);

  // Vérifier si le hostname sans port est une adresse IPv6 (entre crochets pour les URL)
  const isIPv6 = /^\[.*\]$/.test(hostnameWithoutPort);

  // Vérifier si le hostname sans port est 'localhost'
  const isLocalhost = hostnameWithoutPort === "localhost";

  // Si l'URL contient une IP, est en localhost, ou est un fichier local, elle ne peut pas avoir de wildcard
  if (isIPv4 || isIPv6 || isLocalhost || scheme === 'file') {
    return false;
  }

  // Pour tout autre cas, on suppose que c'est un nom de domaine qui peut avoir un sous-domaine
  return true;
}


export const getSubdomainPatternFromUrl = (url: string) => {
  if (!isAllowedUrl(url)) {
    return null;
  }
  const { domain, subdomain, schemeSuffix, hostWithoutSubdomain } = getUrlAsObject(url);
  if (subdomain === null) {
    return null;
  }
  const pattern = `*${schemeSuffix}${subdomain}${hostWithoutSubdomain}/*`;

  return pattern;
};
export const getDomainPatternFromUrl = (url: string) => {
  if (!isAllowedUrl(url)) {
    return null;
  }
  const { domain, schemeSuffix, hostWithoutSubdomain, scheme, path, port } = getUrlAsObject(url);
  if (domain === null) {
    return null;
  }
  const wildcardIfSubdomain = canHaveWildcard(url) ? '*.' : ''
  const schemeIfSubdomain = canHaveWildcard(url) ? '*' : scheme
  const pathIfDomain = scheme === 'file' ? path : '/*'
  const pattern = `${schemeIfSubdomain}${schemeSuffix}${wildcardIfSubdomain}${hostWithoutSubdomain}${pathIfDomain}`;
  return pattern;
};
export const getUrlPatternFromUrl = (url: string) => {
  const {
    subdomain,
    domain,
    hostname,
    pathnameUntilLastSlash,
    scheme,
    schemeSuffix,
  } = getUrlAsObject(url);

  console.log(pathnameUntilLastSlash, " pathnameUntilLastSlash");
  // const pattern = `${scheme}${schemeSuffix}${hostname}${pathnameUntilLastSlash}/*`;
  return url;
};

export const getScopeSetting = (incognito: chrome.tabs.Tab["incognito"]) => {
  return incognito ? "incognito_session_only" : "regular";
};
export const getUrlAsObject = (url: string) => {
  // Nouvelle regex pour inclure la détection de `file:///` avec lettre de lecteur
  const urlRegex = /^(.*?):\/\/\/?([a-zA-Z]:)?([^\/:]*)(:(\d+))?(\/?.*)$/;
  const matches = url.match(urlRegex);

  // Initialisation des variables
  let scheme: PatternScheme;
  let hostname;
  let pathname;
  let port;
  let host;
  let domain;
  let subdomain;
  let isIpAddress = false

  if (!matches) {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Extraction des parties principales de l'URL
  scheme = matches[1] as PatternScheme;
  hostname = matches[2] ? matches[2].slice(0, -1) : matches[3]; // Récupère "C" pour `file:///C:/...`
  port = matches[5] || "";
  pathname = matches[6] || "";
  const schemeSuffix = scheme === "file" ? ":///" : "://";
  
  const pathnameUntilLastSlash = pathname.includes("/")
    ? pathname.slice(0, pathname.lastIndexOf("/"))
    : "";

  // Cas spécial : URL de type file:// avec lettre de lecteur (ex: C: sous Windows)
  const isWindowsDrive = scheme === "file" && /^[a-zA-Z]$/.test(hostname);

  if (isWindowsDrive) {
    domain = host = hostname = hostname + ':';
    pathname = pathname.startsWith(":") ? pathname.slice(1) : pathname;
  } else {
    // Construction du host complet pour les URLs standards (http, https, etc.)
    host = `${hostname}${port ? `:${port}` : ''}`;

    // Vérification si le hostname est une IP
    isIpAddress = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[.*\]$/.test(hostname);
    
    if (isIpAddress) {
      domain = hostname;
    } else {
      // Division du hostname en sous-domaine et domaine
      const domainParts = hostname.split(".");
      if (domainParts.length > 2) {
        domain = domainParts.slice(-2).join(".");
        subdomain = domainParts.slice(0, -2).join(".");
      } else {
        domain = hostname;
      }
    }
  }

  const fixedSubdomain = subdomain ? `${subdomain}.` : "";
  const hostWithoutSubdomain = `${domain}${port ? `:${port}` : ''}`;

  return {
    scheme,
    schemeSuffix,
    host,
    hostname,
    domain,
    subdomain: fixedSubdomain,
    port,
    path: pathname,
    pathnameUntilLastSlash,
    hostWithoutSubdomain,
    isIpAddress
  };
};



// export const getUrlAsObject = (url: string) => {
//   const { domain, subdomain } = parse(url);
//   const { pathname, protocol, hostname } = new URL(url);

//   /** http://, https:// etc... */
//   const scheme = protocol.replace(/\:$/, "");

//   const schemeSuffix = scheme === "file" ? ":///" : "://";

//   const pathnameUntilLastSlash = pathname.substr(0, pathname.lastIndexOf("/"));

//   const fixedSubdomain = subdomain && subdomain.length ? `${subdomain}.` : "";

//   return {
//     hostname,
//     scheme,
//     schemeSuffix,
//     //protocol,
//     domain,
//     subdomain: fixedSubdomain,
//     pathname,
//     path: pathname,
//     pathnameUntilLastSlash,
//   };
// };

export const isValidScheme = (scheme: string) => {
  return ["*", "http", "https", "file", "ftp", "urn"].includes(scheme)
    ? true
    : false;
};

export const isAllowedUrl = (url: string) => {
  const { scheme } = getUrlAsObject(url);
  return isValidScheme(scheme);
  // const regex = /^(http|https|ftp|file|urn):(\/{0,3})(?!\/).*$/gm;
  // return url.match(regex);
};

/**
 * Chrome match pattern replicated
 * Thanks to Xan: https://stackoverflow.com/a/26420284/771165
 */
export const isAllowedPattern = (input: string) => {
  if (typeof input !== "string") return null;
  var match_pattern = "(?:^",
    regEscape = function (s: string) {
      return s.replace(/[[^$.|?*+(){}\\]/g, "\\$&");
    },
    result = /^(\*|https?|file|ftp|chrome-extension):\/\//.exec(input);

  // Parse scheme
  if (!result) return null;
  input = input.substr(result[0].length);
  match_pattern += result[1] === "*" ? "https?://" : result[1] + "://";

  // Parse host if scheme is not `file`
  if (result[1] !== "file") {
    if (!(result = /^(?:\*|(\*\.)?([^\/*]+))(?=\/)/.exec(input))) return null;
    input = input.substr(result[0].length);
    if (result[0] === "*") {
      // host is '*'
      match_pattern += "[^/]+";
    } else {
      if (result[1]) {
        // Subdomain wildcard exists
        match_pattern += "(?:[^/]+\\.)?";
      }
      // Append host (escape special regex characters)
      match_pattern += regEscape(result[2]);
    }
  }
  // Add remainder (path)
  match_pattern += input.split("*").map(regEscape).join(".*");
  match_pattern += "$)";
  return match_pattern === null ? false : true;
};

export const retry = <T>(fn: () => Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve) => {
    fn()
      .then(resolve)
      .catch(() => {
        setTimeout(() => {
          console.log("retrying...");
          retry(fn, ms).then(resolve);
        }, ms);
      });
  });

  export function sortUrlsByPatternPrecedence(urls: string[]) {
      const calculateScore = (url: string) => {
        const { scheme, subdomain, hostWithoutSubdomain, path } = getUrlAsObject(url);
        let score = 0;
    
        // Score pour le scheme
        if (scheme === "*") score += 1;
        else score += 2;
    
        // Score pour le sous-domaine : plus spécifique si pas de wildcard
        if (subdomain === "*.") score += 1;
        else if (subdomain) score += 2;
    
        // Score pour le domaine : plus élevé pour les domaines spécifiques
        if (hostWithoutSubdomain) score += 2;
    
        // Score pour le chemin : plus long = plus spécifique
        score += path === "/*" ? 1 : 2;
    
        return score;
      };
    
      // Trie les URLs en fonction de leur score décroissant
      return urls.sort((a, b) => calculateScore(b) - calculateScore(a));
    };


