/**
 * Token Controls — field projection, compact stripping, and raw inclusion.
 *
 * These utilities are applied at the output boundary of every tool that
 * extends TokenControls in its input interface. The contract:
 *
 *   compact (default true)  — strip low-value / verbose fields from the output
 *   includeRaw (default false) — attach the unprocessed API response
 *   fields[] — project only the named top-level keys into the output
 */

import type { TokenControls } from "./types.js";

/**
 * Apply field projection to an object. If `fields` is undefined or empty,
 * the object is returned as-is. Otherwise, only the specified top-level
 * keys are kept. Supports dot-notation for one level of nesting
 * (e.g. "video.title" keeps the `video` key but filters its children).
 */
export function applyFieldProjection<T extends Record<string, unknown>>(
  obj: T,
  fields?: string[],
): Partial<T> {
  if (!fields || fields.length === 0) {
    return obj;
  }

  // Separate top-level fields from dot-notation fields
  const topLevel = new Set<string>();
  const nested = new Map<string, Set<string>>();

  for (const field of fields) {
    const dot = field.indexOf(".");
    if (dot === -1) {
      topLevel.add(field);
    } else {
      const parent = field.slice(0, dot);
      const child = field.slice(dot + 1);
      topLevel.add(parent);
      if (!nested.has(parent)) {
        nested.set(parent, new Set());
      }
      nested.get(parent)!.add(child);
    }
  }

  const result: Record<string, unknown> = {};

  for (const key of topLevel) {
    if (!(key in obj)) continue;

    const value = obj[key];
    const childFields = nested.get(key);

    if (childFields && value && typeof value === "object" && !Array.isArray(value)) {
      // Apply one level of nested projection
      const sub: Record<string, unknown> = {};
      for (const childKey of childFields) {
        if (childKey in (value as Record<string, unknown>)) {
          sub[childKey] = (value as Record<string, unknown>)[childKey];
        }
      }
      result[key] = sub;
    } else {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

/**
 * Keys that are typically low-value in compact mode and can be stripped
 * to reduce token usage. Tools can override this with their own lists.
 */
const DEFAULT_COMPACT_STRIP_KEYS = new Set([
  "sourceNotes",
  "limitations",
]);

/**
 * Apply all token control transformations to a tool output.
 *
 * @param output   The full tool output object
 * @param controls The token control parameters from the tool input
 * @param rawData  Optional raw API response to attach when includeRaw is true
 * @returns        The transformed output
 */
export function applyTokenControls<T extends Record<string, unknown>>(
  output: T,
  controls: TokenControls | undefined,
  rawData?: unknown,
): Partial<T> & { _raw?: unknown } {
  if (!controls) {
    return output;
  }

  const compact = controls.compact ?? true;
  const includeRaw = controls.includeRaw ?? false;
  const fields = controls.fields;

  let result: Record<string, unknown> = { ...output };

  // 1. Apply compact stripping (remove low-value verbose fields)
  if (compact) {
    for (const key of DEFAULT_COMPACT_STRIP_KEYS) {
      if (key in result) {
        // Only strip if the value is an array (sourceNotes, limitations) — keep if it was explicitly requested via fields
        if (fields && fields.some((f) => f === key || f.startsWith(`${key}.`))) {
          continue;
        }
        const val = result[key];
        if (Array.isArray(val)) {
          delete result[key];
        }
      }
    }

    // Strip provenance.sourceNotes in compact mode (unless fields explicitly asks for it)
    if (result.provenance && typeof result.provenance === "object" && !Array.isArray(result.provenance)) {
      const prov = result.provenance as Record<string, unknown>;
      if (Array.isArray(prov.sourceNotes)) {
        if (!fields || !fields.some((f) => f === "provenance.sourceNotes" || f === "provenance")) {
          const { sourceNotes: _, ...rest } = prov;
          result.provenance = rest;
        }
      }
    }
  }

  // 2. Apply field projection
  if (fields && fields.length > 0) {
    result = applyFieldProjection(result as T, fields) as Record<string, unknown>;
  }

  // 3. Attach raw data if requested
  if (includeRaw && rawData !== undefined) {
    result._raw = rawData;
  }

  return result as Partial<T> & { _raw?: unknown };
}
