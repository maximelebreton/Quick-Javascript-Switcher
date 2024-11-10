// import { shallowMount } from "@vue/test-utils";
// import HelloWorld from "@/components/HelloWorld.vue";
import { getPotentialPatterns } from "@/entry/background/actions";
import { QJS, convertOldRulesToNew } from "@/entry/background/storage";
import { getDomainPatternFromUrl, getSubdomainPatternFromUrl, getUrlAsObject, getUrlPatternFromUrl, sortUrlsByPatternPrecedence } from "@/entry/background/utils";
import satisfies from "semver/functions/satisfies";


describe('getPatterns', () => {

  describe('Subdomain', () => {
    it('Subdomain', () => {
      expect(getSubdomainPatternFromUrl('https://gist.github.com/')).toBe('*://gist.github.com/*')
    })
    it('Domain', () => {
      expect(getDomainPatternFromUrl('https://github.com/')).toBe('*://*.github.com/*')
    })
    it('Ip address', () => {
      expect(getDomainPatternFromUrl('http://127.0.0.1/index.html')).toBe('http://127.0.0.1/*')
    })
    it('Localhost', () => {
        expect(getDomainPatternFromUrl('http://localhost:3000')).toBe('http://localhost:3000/*')
      })
    })
    it('File', () => {
      expect(getUrlPatternFromUrl('file:///C:/Users/Public/index.html')).toBe('file:///C:/Users/Public/index.html')
    })

  
})

describe('It should extract url as object', () => {
  it('should extract the correct url object', () =>  {
    expect(getUrlAsObject('https://github.com/*')).toEqual({
      host: 'github.com',
      hostWithoutSubdomain: 'github.com',
      hostname: 'github.com',
      port: "",
      scheme: 'https',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: '',
      path: '/*',
      pathnameUntilLastSlash: '',
    });

    expect(getUrlAsObject('https://gist.github.com/*')).toEqual({
      host: 'gist.github.com',
      hostWithoutSubdomain: 'github.com',
      hostname: 'gist.github.com',
      port: "",
      scheme: 'https',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: 'gist.',
      path: '/*',
      pathnameUntilLastSlash: '',
    });

    expect(getUrlAsObject('https://*.github.com/*')).toEqual({
      host: '*.github.com',
      hostWithoutSubdomain: 'github.com',
      hostname: '*.github.com',
      port: '',
      scheme: 'https',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: '*.',
      path: '/*',
      pathnameUntilLastSlash: '',
    });

    expect(getUrlAsObject('*://*.github.com/*')).toEqual({
      host: '*.github.com',
      hostWithoutSubdomain: 'github.com',
      hostname: '*.github.com',
      port: '',
      scheme: '*',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: '*.',
      path: '/*',
      pathnameUntilLastSlash: '',
    });
    
    
    expect(getUrlAsObject('file:///C:/Users/Public/index.html')).toEqual({
      host: 'C:',
      hostWithoutSubdomain: 'C:',
      hostname: 'C:',
      port: '',
      scheme: 'file',
      schemeSuffix: ':///',
      domain: 'C:',
      subdomain: '',
      path: '/Users/Public/index.html',
      pathnameUntilLastSlash: '/Users/Public',
    });
    
    expect(getUrlAsObject('http://localhost:3000/index.html')).toEqual({
      host: 'localhost:3000',
      hostWithoutSubdomain: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      scheme: 'http',
      schemeSuffix: '://',
      domain: 'localhost',
      subdomain: '',
      path: '/index.html',
      pathnameUntilLastSlash: '',
    });
    
    expect(getUrlAsObject('http://127.0.0.1:8080/')).toEqual({
      host: '127.0.0.1:8080',
      hostWithoutSubdomain: '127.0.0.1:8080',
      hostname: '127.0.0.1',
      port: '8080',
      scheme: 'http',
      schemeSuffix: '://',
      domain: '127.0.0.1',
      subdomain: '',
      path: '/',
      pathnameUntilLastSlash: '',
    });


    expect(getUrlAsObject('http://10.10.1.1:8080/test')).toEqual({
      host: '10.10.1.1:8080',
      hostWithoutSubdomain: '10.10.1.1:8080',
      hostname: '10.10.1.1',
      port: '8080',
      scheme: 'http',
      schemeSuffix: '://',
      domain: '10.10.1.1',
      subdomain: '',
      path: '/test',
      pathnameUntilLastSlash: '',
    });
  })
})

describe('It should get potential patterns and sort it by precedence', () => {

  it('Subdomain with wildcard path', async () => {
    expect(await getPotentialPatterns('http://gist.github.com/*')).toEqual([
      'http://gist.github.com/*',
      '*://gist.github.com/*',
      'http://*.github.com/*',
      '*://*.github.com/*'
    ])
  })

  it('Wildcard subdomain ', async () => {
    expect(await getPotentialPatterns('*://*.github.com/*')).toEqual([
      'http://*.github.com/*',
      'https://*.github.com/*',
      '*://*.github.com/*',
    ])
  })

  it('Domain only', async () => {
    expect(await getPotentialPatterns('https://github.com/*')).toEqual([
      'https://github.com/*',
      '*://github.com/*',
    ])
  })
  
  it('Subdomain with path', async () => {
    expect(await getPotentialPatterns('https://gist.github.com/maximelebreton')).toEqual([
      'https://gist.github.com/*',
      '*://gist.github.com/*',
      'https://*.github.com/*',
      '*://*.github.com/*'
    ])
  })

  it('file:///', async () => {
    expect(await getPotentialPatterns('file:///C:/Users/Public/index.html')).toEqual([])
  })

  it('Ip adress', async () => {
    expect(await getPotentialPatterns('http://127.0.0.1/index.html')).toEqual([
      'http://127.0.0.1/*',
      '*://127.0.0.1/*',
    ])
  })
    
  it('Localhost and port', async () => {
    expect(await getPotentialPatterns('http://localhost:3000/index.html')).toEqual([
      'http://localhost:3000/*',
      '*://localhost:3000/*',
    ])
  })

  it('should throw an error for an invalid URL', () => {
    expect(() => getUrlAsObject('invalid-url')).toThrowError();
  });

})

describe("Storage", () => {
  // it("renders props.msg when passed", () => {
  //   const msg = "new message";
  //   const wrapper = shallowMount(HelloWorld, {
  //     props: { msg },
  //   });
  //   expect(wrapper.text()).toMatch(msg);
  // });

  it("should convert old rules to new", () => {
    const rule1: QJS.ContentSettingRule = {
      primaryPattern: "*://*.github.com/*",
      scope: "regular",
      setting: "allow",
    };
    const rule2: QJS.ContentSettingRule = {
      primaryPattern: "*://www.twitter.com/*",
      scope: "incognito_session_only",
      setting: "block",
    };

    const oldRules: Array<QJS.ContentSettingRule> = [rule1, rule2];
    const convertedRules = convertOldRulesToNew(oldRules);

    expect(convertedRules).toMatchObject({
      [rule1.primaryPattern]: rule1,
      [rule2.primaryPattern]: rule2,
    });
  });


  it('should sort urls by pattern precedence', () =>  {

    const unsortedUrls = [
      '*://*.github.com/*',
      'https://*.github.com/*',
      '*://gist.github.com/*',
      'https://gist.github.com/*',
    ]

    const sortedUrls = sortUrlsByPatternPrecedence(unsortedUrls)
console.log(sortedUrls, "SORTED")
    expect(sortedUrls).toEqual([
      'https://gist.github.com/*',
      'https://*.github.com/*',
      '*://gist.github.com/*',
      '*://*.github.com/*'
    ])

  })

  

  

  it("should deep remove", async () => {
    
  });

  it("should update when comes from 1.4.4 to 2.0.0", () => {
    const isFromV1ToV2 =
      satisfies("1.4.4", "<2.0.0") && satisfies("2.0.0", ">=2.0.0");

    expect(isFromV1ToV2).toBe(true);
  });
});
