"use client";

import { useEffect, useMemo, useState } from "react";
import type { HfGridCell } from "./contentSchema";
import {
  applyLegendVisibility,
  resolveLegendTypes,
  sortLegendItems,
  type LegendPreviewItem,
} from "./legendDataResolver";

function legendTypeKeys(cell: Pick<HfGridCell, "content" | "legendTypes" | "type">): string[] {
  if (cell.type !== "legend") return [];
  if (Array.isArray(cell.legendTypes) && cell.legendTypes.length > 0) {
    return cell.legendTypes.filter(Boolean);
  }
  return cell.content ? [cell.content] : [];
}

/**
 * Loads module graphics for the legend type(s) on a cell and applies
 * visibility / sort so the canvas and inspector can preview real symbols.
 */
export function useLegendPreviewItems(cell: HfGridCell | null | undefined): {
  items: LegendPreviewItem[];
  loading: boolean;
  types: string[];
} {
  const types = useMemo(() => (cell ? legendTypeKeys(cell) : []), [cell]);
  const typesKey = types.join("|");
  const [rawItems, setRawItems] = useState<LegendPreviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!typesKey) {
      setRawItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void resolveLegendTypes(typesKey.split("|")).then((items) => {
      if (cancelled) return;
      setRawItems(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [typesKey]);

  const items = useMemo(() => {
    if (!cell || cell.type !== "legend") return [];
    const visible = applyLegendVisibility(
      rawItems,
      cell.legendVisibility,
      cell.legendCustomLabels,
      cell.legendCustomItems
    );
    return sortLegendItems(visible, cell.legendSort);
  }, [cell, rawItems]);

  return { items, loading, types };
}
