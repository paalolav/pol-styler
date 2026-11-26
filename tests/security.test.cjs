const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function initialize(cssFilePath) {
  const loaded = [];
  const warnings = [];
  const source = fs.readFileSync('src/extensions/PolStyler/PolStylerApplicationCustomizer.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mocks = {
    '@microsoft/sp-core-library': { Log: { info() {}, warn(...args) { warnings.push(args); } } },
    '@microsoft/sp-application-base': { BaseApplicationCustomizer: class {}, PlaceholderName: { Top: 1 } },
    '@microsoft/sp-loader': { SPComponentLoader: { loadCss(url) { loaded.push(url); } } },
    'PolStylerApplicationCustomizerStrings': { Title: 'Styler' }
  };
  const context = {
    exports: {}, URL,
    document: { location: new URL('https://tenant.sharepoint.com/sites/team/page.aspx') },
    require(name) { assert.ok(name in mocks, `Unexpected import ${name}`); return mocks[name]; }
  };
  vm.runInNewContext(compiled, context);
  const instance = new context.exports.default();
  instance.properties = { cssFilePath };
  instance.context = { placeholderProvider: { changedEvent: { add() {}, remove() {} } } };
  return { instance, loaded, warnings };
}

for (const path of ['/sites/cdn/Styling/PolStyler.css', 'sites/cdn/Styling/PolStyler.css',
  ' https://tenant.sharepoint.com/sites/cdn/Styling/PolStyler.css ',
  'HTTPS://TENANT.SHAREPOINT.COM/sites/cdn/Styling/PolStyler.css']) {
  test(`accept trusted path ${path}`, async () => {
    const { instance, loaded } = initialize(path);
    await instance.onInit();
    assert.deepEqual(loaded, ['https://tenant.sharepoint.com/sites/cdn/Styling/PolStyler.css']);
  });
}
for (const path of [undefined, null, '', ' ', 7, {}, [], 'https://evil.example/style.css',
  '//evil.example/style.css', '\\evil.example/style.css',
  'https://tenant.sharepoint.com.evil.example/style.css',
  'https://tenant.sharepoint.com@evil.example/style.css',
  'https://user:password@tenant.sharepoint.com/style.css',
  'https://tenant.sharepoint.com:444/style.css',
  'http://tenant.sharepoint.com/style.css', 'javascript:alert(1)', 'data:text/css,body{}',
  'https://', 'https://tenant.sharepoint.com/\nstyle.css']) {
  test(`reject invalid input ${JSON.stringify(path)}`, async () => {
    const { instance, loaded, warnings } = initialize(path);
    await instance.onInit();
    assert.deepEqual(loaded, []);
    assert.ok(!JSON.stringify(warnings).includes('password'), 'Do not log URL credentials');
  });
}
