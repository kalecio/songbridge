import { error, warn, info, attachConsole } from '@tauri-apps/plugin-log';

function formatError(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }
  return String(value);
}

export async function initLogger() {
  // Mirror plugin log output back to the browser console in dev builds
  if (import.meta.env.DEV) {
    await attachConsole();
  }

  window.addEventListener('error', (event) => {
    error(`Unhandled error: ${event.message} (${event.filename}:${event.lineno}:${event.colno})`).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    error(`Unhandled promise rejection: ${formatError(event.reason)}`).catch(() => {});
  });
}

export { error, warn, info };
