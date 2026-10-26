// Shared preamble, inlined into each page script by run-checks.sh (scripts run
// from the repo dir via `node --input-type=module < file`, so they can't import
// a sibling file by relative path).
import {chromium, expect} from '@playwright/test';
const BASE = 'http://localhost:3000';
const STORAGE_STATE = '.auth/e2e-session.json';
const EXECUTABLE = '/opt/pw-browsers/chromium';
const DESKTOP = {viewport: {width: 1280, height: 800}};
const MOBILE = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true};
const results = [];
const errors = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (error) {
    results.push(['FAIL', name, String(error.message).split('\n')[0].slice(0, 300)]);
  }
};
const attach = page => {
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text().slice(0, 300));
  });
  page.on('pageerror', error => errors.push(error.message.slice(0, 300)));
};
const openPage = async (page, path) => {
  await page.goto(BASE + path);
  await page.waitForLoadState('networkidle');
};
const reload = async page => {
  await page.reload();
  await page.waitForLoadState('networkidle');
};
const waitForAction = (page, path) =>
  page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === path,
  );
const newPage = async (browser, device) => {
  const context = await browser.newContext({...device, storageState: STORAGE_STATE, baseURL: BASE});
  const page = await context.newPage();
  attach(page);
  return page;
};
const finish = async browser => {
  await browser.close();
  for (const row of results) console.log(row.join(' | '));
  console.log(`console errors: ${errors.length}`);
  for (const error of errors) console.log('  ' + error);
  const failed = results.filter(([status]) => status === 'FAIL').length;
  console.log(`SUMMARY ${results.length - failed}/${results.length} passed, ${errors.length} console errors`);
  process.exit(failed || errors.length ? 1 : 0);
};
// Warm the dev server's compile cache: on a cold Turbopack server the first
// load reaches networkidle before React has attached its handlers.
const warmUp = async (browser, paths) => {
  const page = await newPage(browser, DESKTOP);
  for (const path of paths) {
    await openPage(page, path);
    await page.waitForTimeout(1500);
  }
  await page.context().close();
};
const browser = await chromium.launch({executablePath: EXECUTABLE});
