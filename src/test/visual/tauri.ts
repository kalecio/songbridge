import { library } from './data';
// Browser-only adapter for visual QA. Never included by the desktop entry point.
export async function invoke(command: string, args?: { path?: string }) {
  if (command === 'get_metadata') return library.find((track) => track.path === args?.path) ?? library[0];
  if (command === 'get_track_image') return null;
  return undefined;
}
export async function listen() {
  return () => {};
}
export async function open() {
  return null;
}
