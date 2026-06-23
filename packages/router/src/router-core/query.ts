/**
 * Parse a URLSearchParams into a plain object.
 * Single-value keys become strings; repeated keys become string arrays.
 */
export function parseQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }

  return result;
}

/**
 * Serialize a query object into a query string (without leading `?`).
 *
 * Array values become repeated keys (`tag=a&tag=b`), the inverse of
 * {@link parseQuery}. `undefined` array entries are skipped.
 */
export function buildQueryString(
  query: Record<string, string | string[]> | undefined,
): string {
  if (!query || Object.keys(query).length === 0) return "";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  return params.toString();
}
