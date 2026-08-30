import { parseAllowedCssHosts, resolveCssUrl } from '../cssSource';

describe('CSS source security controls', () => {
  test('loads relative and absolute same-origin CSS files', () => {
    expect(resolveCssUrl('/sites/cdn/Styling/PolStyler.css', 'https://tenant.example')).toBe(
      'https://tenant.example/sites/cdn/Styling/PolStyler.css'
    );
    expect(
      resolveCssUrl('https://tenant.example/styles/site.css?v=2', 'https://tenant.example')
    ).toBe('https://tenant.example/styles/site.css?v=2');
  });

  test('normalizes explicit external host entries', () => {
    expect(
      parseAllowedCssHosts('cdn.example.com, https://assets.example.com/path, http://unsafe.example')
    ).toEqual(['https://cdn.example.com', 'https://assets.example.com']);
  });

  test('rejects unlisted external, non-HTTPS, and non-CSS sources', () => {
    expect(() =>
      resolveCssUrl('https://attacker.example/site.css', 'https://tenant.example')
    ).toThrow('not an allowed CSS host');
    expect(() =>
      resolveCssUrl('http://tenant.example/site.css', 'https://tenant.example')
    ).toThrow('Only HTTPS');
    expect(() =>
      resolveCssUrl('/sites/cdn/Styling/payload.html', 'https://tenant.example')
    ).toThrow('must end in .css');
  });

  test('loads an external HTTPS CSS file only when its origin is allow-listed', () => {
    expect(
      resolveCssUrl(
        'https://cdn.example.com/site.css',
        'https://tenant.example',
        'cdn.example.com'
      )
    ).toBe('https://cdn.example.com/site.css');
  });

  test('rejects credential-bearing URLs even on allowed hosts', () => {
    expect(() =>
      resolveCssUrl(
        'https://user:secret@cdn.example.com/site.css',
        'https://tenant.example',
        'cdn.example.com'
      )
    ).toThrow('credentials');
  });
});
