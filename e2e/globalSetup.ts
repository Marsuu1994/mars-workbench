import {execFileSync} from 'node:child_process';
import {E2E_STORAGE_STATE} from '../playwright.config';

/** Before every run: the e2e user's fresh week and session (see the script). */
export default function globalSetup() {
  execFileSync(
    'npm',
    ['run', '--silent', 'e2e:session', '--', E2E_STORAGE_STATE],
    {stdio: 'inherit'},
  );
}
