/**
 * Component tests run in Chromium against the app's real stylesheet, so a
 * test can read what the user sees (computed styles, focus, layout) rather
 * than class names. The page is stamped with the app's default theme.
 */
import '@/app/globals.css';
import {DEFAULT_THEME} from '@/utils/theme';

document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
