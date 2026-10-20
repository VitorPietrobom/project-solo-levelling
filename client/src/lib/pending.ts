/** Optimistic rows use a `temp-` id until the server responds with the real one. */
export function isPending(id: string): boolean {
  return id.startsWith('temp-');
}
