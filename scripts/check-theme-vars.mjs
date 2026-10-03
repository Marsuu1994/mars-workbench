/**
 * Theme variable contract — run by CI as `npm run check:themes`.
 *
 * Every theme declares the same set of CSS custom properties: its daisyUI
 * `@plugin "daisyui/theme"` block plus its `[data-theme='…']` blocks in
 * src/app/globals.css. A variable added for one theme must land in all of
 * them in the same change. Themes come from THEMES in src/utils/theme.ts, so
 * a new theme is held to the same contract the moment it is registered.
 */
import {readFileSync} from 'node:fs';

const CSS_PATH = 'src/app/globals.css';
const THEMES_PATH = 'src/utils/theme.ts';

const themesSource = readFileSync(THEMES_PATH, 'utf8');
const themesList = themesSource.match(/THEMES\s*=\s*\[([^\]]*)\]/);
if (!themesList) {
  throw new Error(`Could not find the THEMES array in ${THEMES_PATH}`);
}
const themes = [...themesList[1].matchAll(/'([\w-]+)'/g)].map(m => m[1]);

const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '');
const stripStrings = text => text.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""');

/** Every `{…}` block as {selector, body}, ignoring braces in comments and strings. */
const parseBlocks = css => {
  const blocks = [];
  const stack = [];
  let segmentStart = 0;
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '/' && css[i + 1] === '*') {
      i = css.indexOf('*/', i + 2) + 1;
      continue;
    }
    if (char === '"' || char === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== char) j += css[j] === '\\' ? 2 : 1;
      i = j;
      continue;
    }
    if (char === '{') {
      stack.push({selector: css.slice(segmentStart, i), open: i});
      segmentStart = i + 1;
    } else if (char === '}') {
      const {selector, open} = stack.pop();
      blocks.push({
        selector: stripComments(selector).trim(),
        body: css.slice(open + 1, i),
      });
      segmentStart = i + 1;
    } else if (char === ';') {
      segmentStart = i + 1;
    }
  }
  return blocks;
};

const DAISY_BLOCK = '@plugin "daisyui/theme"';
const THEME_SCOPE = /^\[data-theme=(['"]?)([\w-]+)\1\]$/;

/** theme name → Set of custom properties it declares */
const declared = new Map();
for (const {selector, body} of parseBlocks(readFileSync(CSS_PATH, 'utf8'))) {
  let theme = null;
  if (selector === DAISY_BLOCK) {
    theme = stripComments(body).match(/name:\s*(['"])([\w-]+)\1/)?.[2] ?? null;
  } else {
    theme = selector.match(THEME_SCOPE)?.[2] ?? null;
  }
  if (!theme) continue;

  const properties = declared.get(theme) ?? new Set();
  const declarations = stripStrings(stripComments(body)).matchAll(
    /(--[\w-]+)\s*:/g,
  );
  for (const [, property] of declarations) properties.add(property);
  declared.set(theme, properties);
}

const problems = [];
for (const theme of themes) {
  if (!declared.has(theme)) {
    problems.push(`${theme}: registered in ${THEMES_PATH} but has no blocks`);
  }
}
for (const theme of declared.keys()) {
  if (!themes.includes(theme)) {
    problems.push(`${theme}: has blocks but is not registered in THEMES`);
  }
}

const contract = new Set([...declared.values()].flatMap(set => [...set]));
for (const [theme, properties] of declared) {
  const missing = [...contract].filter(property => !properties.has(property));
  if (missing.length > 0) {
    problems.push(`${theme} is missing ${missing.join(', ')}`);
  }
}

if (problems.length > 0) {
  console.error('Theme variable contract broken — every theme must declare');
  console.error('the same custom properties (src/app/globals.css):');
  for (const problem of problems) console.error(`  • ${problem}`);
  process.exit(1);
}

console.log(
  `Theme variable contract OK: ${themes.length} themes (${themes.join(', ')}) declare the same ${contract.size} variables.`,
);
