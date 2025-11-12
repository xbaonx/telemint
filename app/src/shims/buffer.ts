// Buffer polyfill for browser environments (e.g., Telegram WebView)
// Ensures libraries expecting Node's Buffer work properly
import { Buffer } from 'buffer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = typeof globalThis !== 'undefined' ? globalThis : window;

if (!g.Buffer) {
  g.Buffer = Buffer;
}
