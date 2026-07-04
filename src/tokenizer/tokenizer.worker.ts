// Vite ES-module worker entry (2B). Registers the tiktoken adapter, then imports the worker boundary which
// self-installs the single message listener (only inside a real WorkerGlobalScope). Same-origin file, loaded
// via new URL(..., import.meta.url) with {type:'module'} — NOT a blob: URL, so it satisfies worker-src 'self'
// under the strict CSP. Owner: TokenTally UI. Version: Phase 2B.
import { bootstrapTokenizer } from '@/tokenizer/bootstrap';
import '@/tokenizer/worker'; // installs the message handler (once) during module eval

bootstrapTokenizer(); // register adapters before any message is processed (runs during eval, pre-message)
