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
      hostname: 'github.com',
      scheme: 'https',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: '',
      path: '/*',
      pathnameUntilLastSlash: '',
    });

    expect(getUrlAsObject('https://gist.github.com/*')).toEqual({
      hostname: 'gist.github.com',
      scheme: 'https',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: 'gist.',
      path: '/*',
      pathnameUntilLastSlash: '',
    });

    expect(getUrlAsObject('https://*.github.com/*')).toEqual({
      hostname: '*.github.com',
      scheme: 'https',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: '*.',
      path: '/*',
      pathnameUntilLastSlash: '',
    });

    expect(getUrlAsObject('*://*.github.com/*')).toEqual({
      hostname: '*.github.com',
      scheme: '*',
      schemeSuffix: '://',
      domain: 'github.com',
      subdomain: '*.',
      path: '/*',
      pathnameUntilLastSlash: '',
    });
    
    
    expect(getUrlAsObject('file:///C:/Users/Public/index.html')).toEqual({
      hostname: 'C:',
      scheme: 'file',
      schemeSuffix: ':///',
      domain: 'C:',
      subdomain: '',
      path: '/Users/Public/index.html',
      pathnameUntilLastSlash: '/Users/Public',
    });
    
    expect(getUrlAsObject('http://localhost:3000/index.html')).toEqual({
      hostname: 'localhost:3000',
      scheme: 'http',
      schemeSuffix: '://',
      domain: 'localhost:3000',
      subdomain: '',
      path: '/index.html',
      pathnameUntilLastSlash: '',
    });
    
    expect(getUrlAsObject('http://localhost:8080/')).toEqual({
      hostname: 'localhost:8080',
      scheme: 'http',
      schemeSuffix: '://',
      domain: 'localhost:8080',
      subdomain: '',
      path: '/',
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
    expect(() => getUrlAsObject('invalid-url')).toThrowError('Invalid url!');
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
