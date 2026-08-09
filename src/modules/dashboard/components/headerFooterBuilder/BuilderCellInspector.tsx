"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { updateProfile } from "@/modules/auth/services/authApi";
import { fileToCompanyLogoDataUrl } from "@/modules/super-admin/utils/userFormUtils";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { COMPANY_LOGO_PATH } from "../../data/branding";
import { DynamicStringBuilderModal } from "./DynamicStringBuilderModal";
import type { HfCellType, HfGridCell, HfLegendColumnContent } from "./contentSchema";
import {
  HF_LEGEND_COLUMN_CONTENT_OPTIONS,
  HF_LEGEND_SORT_OPTIONS,
  HF_LEGEND_TYPE_OPTIONS,
  HF_LEGEND_VISIBILITY_OPTIONS,
  defaultLegendColumnDefs,
  legendTypeLabel,
} from "./legendOptions";
import { useLegendPreviewItems } from "./useLegendPreviewItems";

const COMPANY_LOGO_TOKEN = "{{company.logo}}";
const PROFILE_LOGO_FALLBACK = COMPANY_LOGO_PATH;
const LOGO_ACCEPT = ".jpeg,.png,.jpg,.gif,.svg,image/*";
const LOGO_MAX_MB = 2;

export type CellStylePatch = Partial<Omit<HfGridCell, "row" | "col" | "rowSpan" | "colSpan">>;

export type InspectorTarget = {
  key: string;
  title: string;
  subtitle: string;
  /** What is being edited — drives panel copy and available controls. */
  mode: "cell" | "content" | "frame";
  cell: HfGridCell;
  allowContentType: boolean;
  syncBorders: boolean;
  widthPx?: number;
  onWidthPxChange?: (widthPx: number) => void;
};

type BuilderCellInspectorProps = Readonly<{
  target: InspectorTarget | null;
  copiedStyle: CellStylePatch | null;
  onChange: (patch: CellStylePatch, options?: { syncAdjacentBorders?: boolean }) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onClose: () => void;
}>;

const PADDING_OPTIONS = [0, 2, 4, 5, 6, 8, 10, 12, 16, 20, 24];

const CONTENT_TYPES: Array<{ type: HfCellType; label: string }> = [
  { type: "empty", label: "Empty" },
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "legend", label: "Legend" },
];

export function BuilderCellInspector({
  target,
  copiedStyle,
  onChange,
  onCopyStyle,
  onPasteStyle,
  onClose,
}: BuilderCellInspectorProps) {
  const [stringBuilderFor, setStringBuilderFor] = useState<string | null>(null);
  const { user, setUser } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoInputId = useId();
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const legendPreview = useLegendPreviewItems(
    target?.cell.type === "legend" ? target.cell : null
  );

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  // Image cells always bind to the logged-in profile logo (no URL/variable field).
  useEffect(() => {
    if (!target?.allowContentType || target.cell.type !== "image") return;
    if (target.cell.imageSrc.trim() === COMPANY_LOGO_TOKEN) return;
    onChange({ type: "image", imageSrc: COMPANY_LOGO_TOKEN });
  }, [
    target?.allowContentType,
    target?.cell.type,
    target?.cell.imageSrc,
    target?.key,
    onChange,
  ]);

  // Only show the properties sidebar when a cell / content area / frame is selected.
  if (!target) return null;

  const cell = target.cell;
  const isContentArea = target.mode === "content";
  const stringBuilderOpen = stringBuilderFor === target.key && cell.type === "text";
  const borderOptions = target.syncBorders ? { syncAdjacentBorders: true } : undefined;
  const allBordersOn =
    cell.borderTop && cell.borderRight && cell.borderBottom && cell.borderLeft;
  const noBorders =
    !cell.borderTop && !cell.borderRight && !cell.borderBottom && !cell.borderLeft;
  const profileLogoUrl = user?.companyLogoUrl?.trim() || PROFILE_LOGO_FALLBACK;
  const profileCompanyName = user?.companyName?.trim() || null;
  const profileName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Your profile";
  const displayedLogoSrc = logoPreview || profileLogoUrl;
  const hasCustomLogo = Boolean(user?.companyLogoUrl?.trim() || logoPreview);

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      showApiError(new Error(`Logo must be ${LOGO_MAX_MB} MB or smaller.`), "Logo upload failed");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    setLogoUploading(true);
    try {
      const dataUrl = await fileToCompanyLogoDataUrl(file);
      const result = await updateProfile({ companyLogoUrl: dataUrl });
      if (result.data?.user) {
        setUser(result.data.user);
      }
      onChange({ type: "image", imageSrc: COMPANY_LOGO_TOKEN });
      showApiSuccess(result.message, "Profile logo saved");
    } catch (err) {
      showApiError(err, "Failed to upload profile logo");
      setLogoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const clearProfileLogo = async () => {
    setLogoUploading(true);
    try {
      const result = await updateProfile({ companyLogoUrl: null });
      if (result.data?.user) {
        setUser(result.data.user);
      }
      setLogoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      onChange({ type: "image", imageSrc: COMPANY_LOGO_TOKEN });
      showApiSuccess(result.message, "Profile photo reset to default");
    } catch (err) {
      showApiError(err, "Failed to remove profile logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const setContentType = (type: HfCellType) => {
    if (type === "legend") {
      onChange({
        type,
        content: cell.content && HF_LEGEND_TYPE_OPTIONS.some((o) => o.value === cell.content)
          ? cell.content
          : "",
        legendTypes:
          cell.legendTypes.length > 0
            ? cell.legendTypes
            : cell.content
              ? [cell.content]
              : [],
        legendVisibility: cell.legendVisibility || "all",
        legendSort: cell.legendSort || "default",
        legendColumnDefs:
          cell.legendColumnDefs?.length > 0
            ? cell.legendColumnDefs
            : defaultLegendColumnDefs(),
        legendTextAlign: cell.legendTextAlign || "left",
      });
    } else if (type === "image") {
      onChange({ type, imageSrc: COMPANY_LOGO_TOKEN });
    } else {
      onChange({ type });
    }
    setStringBuilderFor(type === "text" ? target.key : null);
  };

  const setLegendType = (value: string) => {
    onChange({
      type: "legend",
      content: value,
      legendTypes: value ? [value] : [],
    });
  };

  const toggleLegendColumn = (content: HfLegendColumnContent) => {
    const current = cell.legendColumnDefs?.length
      ? [...cell.legendColumnDefs]
      : defaultLegendColumnDefs();
    const exists = current.some((def) => def.content === content);
    let next = exists
      ? current.filter((def) => def.content !== content)
      : [...current, { content, widthPct: content === "graphic" ? 30 : 70 }];
    if (next.length === 0) {
      next = [{ content: "graphic", widthPct: 100 }];
    }
    const total = next.reduce((sum, def) => sum + def.widthPct, 0) || next.length;
    next = next.map((def) => ({
      ...def,
      widthPct: Math.max(1, Math.round((def.widthPct / total) * 100)),
    }));
    onChange({ legendColumnDefs: next });
  };

  const toggleSide = (
    side: "borderTop" | "borderRight" | "borderBottom" | "borderLeft"
  ) => {
    onChange({ [side]: !cell[side], borderWidth: cell.borderWidth || 1 }, borderOptions);
  };

  const setAllBorders = (enabled: boolean) => {
    onChange(
      {
        borderTop: enabled,
        borderRight: enabled,
        borderBottom: enabled,
        borderLeft: enabled,
        ...(enabled ? { borderWidth: cell.borderWidth || 1 } : {}),
      },
      borderOptions
    );
  };

  return (
    <aside
      className="hf-builder__inspector"
      aria-label={isContentArea ? "Content area properties" : target.title}
    >
      <div className="hf-builder__inspector-head">
        <h3 className="hf-builder__inspector-title">
          <TuneIcon />
          <span>
            {target.title}
            <small>{target.subtitle}</small>
          </span>
        </h3>
        <div className="hf-builder__inspector-actions">
          <button
            type="button"
            className="hf-builder__icon-btn"
            title={isContentArea ? "Copy content area style" : "Copy cell style"}
            aria-label={isContentArea ? "Copy content area style" : "Copy cell style"}
            onClick={onCopyStyle}
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            className="hf-builder__icon-btn"
            title={isContentArea ? "Paste content area style" : "Paste cell style"}
            aria-label={isContentArea ? "Paste content area style" : "Paste cell style"}
            disabled={!copiedStyle}
            onClick={onPasteStyle}
          >
            <BrushIcon />
          </button>
          <button
            type="button"
            className="hf-builder__icon-btn"
            title="Hide properties"
            aria-label="Hide properties"
            onClick={onClose}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="hf-builder__inspector-body">
        {isContentArea ? (
          <p className="hf-builder__hint" style={{ marginTop: 0 }}>
            Styles the report body content frame (borders, background, padding). Header and
            footer cells are edited separately via Cell Properties.
          </p>
        ) : null}
        {target.allowContentType ? (
          <div className="hf-builder__props-group">
            <p className="hf-builder__group-label">Content Type</p>
            <div className="hf-builder__type-grid" role="group" aria-label="Content type">
              {CONTENT_TYPES.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className={`hf-builder__type-btn${cell.type === entry.type ? " is-on" : ""}`}
                  title={entry.label}
                  aria-label={entry.label}
                  aria-pressed={cell.type === entry.type}
                  onClick={() => setContentType(entry.type)}
                >
                  <ContentTypeIcon type={entry.type} />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {target.allowContentType && cell.type === "text" ? (
          <div className="hf-builder__props-group">
            <div className="hf-builder__group-label-row">
              <p className="hf-builder__group-label">Text</p>
              <button
                type="button"
                className="hf-builder__link-btn"
                onClick={() => setStringBuilderFor(target.key)}
              >
                Dynamic String Builder
              </button>
            </div>

            <textarea
              className="hf-builder__textarea"
              rows={3}
              value={cell.content}
              onChange={(event) => onChange({ content: event.target.value })}
              placeholder="Enter text or insert variables…"
            />

            <div className="hf-builder__btn-row">
              <div className="hf-builder__btn-cluster" role="group" aria-label="Font style">
                <button
                  type="button"
                  className={`hf-builder__mini-btn${cell.fontBold ? " is-on" : ""}`}
                  title="Bold"
                  aria-label="Bold"
                  onClick={() => onChange({ fontBold: !cell.fontBold })}
                >
                  <BoldIcon />
                </button>
                <button
                  type="button"
                  className={`hf-builder__mini-btn${cell.fontItalic ? " is-on" : ""}`}
                  title="Italic"
                  aria-label="Italic"
                  onClick={() => onChange({ fontItalic: !cell.fontItalic })}
                >
                  <ItalicIcon />
                </button>
                <button
                  type="button"
                  className={`hf-builder__mini-btn${cell.fontUnderline ? " is-on" : ""}`}
                  title="Underline"
                  aria-label="Underline"
                  onClick={() => onChange({ fontUnderline: !cell.fontUnderline })}
                >
                  <UnderlineIcon />
                </button>
              </div>

              <div className="hf-builder__btn-cluster" role="group" aria-label="Horizontal align">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`hf-builder__mini-btn${cell.textAlign === align ? " is-on" : ""}`}
                    title={`Align ${align}`}
                    aria-label={`Align ${align}`}
                    onClick={() => onChange({ textAlign: align })}
                  >
                    <AlignIcon align={align} />
                  </button>
                ))}
              </div>

              <div className="hf-builder__btn-cluster" role="group" aria-label="Vertical align">
                {(["top", "middle", "bottom"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`hf-builder__mini-btn${cell.verticalAlign === align ? " is-on" : ""}`}
                    title={`Align ${align}`}
                    aria-label={`Vertical align ${align}`}
                    onClick={() => onChange({ verticalAlign: align })}
                  >
                    <VerticalAlignIcon align={align} />
                  </button>
                ))}
              </div>
            </div>

            <div className="hf-builder__twocol">
              <div>
                <p className="hf-builder__field-label">Font size</p>
                <div className="hf-builder__select-wrap">
                  <select
                    className="hf-builder__native-select"
                    value={cell.fontSize}
                    onChange={(event) => onChange({ fontSize: event.target.value })}
                  >
                    {["8pt", "9pt", "10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt"].map(
                      (size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      )
                    )}
                  </select>
                  <ChevronDownIcon />
                </div>
              </div>
              <div>
                <p className="hf-builder__field-label">Text color</p>
                <input
                  type="color"
                  className="hf-builder__color-input"
                  value={cell.fontColor}
                  onChange={(event) => onChange({ fontColor: event.target.value })}
                />
              </div>
            </div>
          </div>
        ) : null}

        {target.allowContentType && cell.type === "image" ? (
          <div className="hf-builder__props-group">
            <p className="hf-builder__group-label">Image</p>

            <div className="hf-builder__profile-logo">
              <input
                ref={logoInputRef}
                id={logoInputId}
                type="file"
                accept={LOGO_ACCEPT}
                className="hf-builder__profile-logo-input"
                disabled={logoUploading}
                onChange={(event) => void handleLogoUpload(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="hf-builder__profile-logo-btn is-active"
                aria-label="Upload profile photo"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayedLogoSrc} alt={profileName} />
              </button>
              <div className="hf-builder__profile-logo-meta">
                <p className="hf-builder__field-label" style={{ margin: 0 }}>
                  Profile photo
                </p>
                <p className="hf-builder__hint" style={{ margin: 0 }}>
                  {profileName}
                  {logoUploading ? " · Saving…" : ""}
                </p>
                {profileCompanyName ? (
                  <p className="hf-builder__hint" style={{ margin: 0 }}>
                    {profileCompanyName}
                  </p>
                ) : null}
                {user?.email ? (
                  <p className="hf-builder__hint" style={{ margin: 0 }}>
                    {user.email}
                  </p>
                ) : null}
                <div className="hf-builder__profile-logo-actions">
                  <button
                    type="button"
                    className="hf-builder__chip-btn"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {hasCustomLogo ? "Replace" : "Upload"}
                  </button>
                  {hasCustomLogo ? (
                    <button
                      type="button"
                      className="hf-builder__chip-btn"
                      disabled={logoUploading}
                      onClick={() => void clearProfileLogo()}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="hf-builder__hint" style={{ marginTop: 10 }}>
              Same photo as Account Settings. Upload to replace it for your profile.
            </p>

            <p className="hf-builder__field-label" style={{ marginTop: 12 }}>
              Fit
            </p>
            <div className="hf-builder__select-wrap">
              <select
                className="hf-builder__native-select"
                value={cell.imageFit}
                onChange={(event) =>
                  onChange({ imageFit: event.target.value as HfGridCell["imageFit"] })
                }
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="fill">Fill</option>
              </select>
              <ChevronDownIcon />
            </div>
          </div>
        ) : null}

        {target.allowContentType && cell.type === "legend" ? (
          <div className="hf-builder__props-group">
            <p className="hf-builder__group-label">Legend</p>
            <p className="hf-builder__hint">
              Choosing a legend type tells the renderer which symbol set to resolve
              (water, samples, drilling, etc.). Without a type the cell stays empty.
            </p>

            <p className="hf-builder__field-label">Legend type</p>
            <div className="hf-builder__select-wrap">
              <select
                className="hf-builder__native-select"
                value={cell.content || ""}
                onChange={(event) => setLegendType(event.target.value)}
              >
                <option value="">Select legend type…</option>
                {HF_LEGEND_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>

            {cell.content ? (
              <div className="hf-builder__legend-preview">
                <p className="hf-builder__field-label" style={{ marginTop: 10 }}>
                  Module symbols ({legendTypeLabel(cell.content)})
                </p>
                {legendPreview.loading && legendPreview.items.length === 0 ? (
                  <p className="hf-builder__hint">Loading graphics…</p>
                ) : legendPreview.items.length === 0 ? (
                  <p className="hf-builder__hint">No graphics found for this legend type.</p>
                ) : (
                  <ul className="hf-builder__legend-preview-list">
                    {legendPreview.items.slice(0, 24).map((item) => (
                      <li key={`${item.legendType ?? cell.content}:${item.label}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt="" />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {legendPreview.items.length > 24 ? (
                  <p className="hf-builder__hint">
                    Showing 24 of {legendPreview.items.length} symbols
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="hf-builder__field-label" style={{ marginTop: 10 }}>
              Visibility
            </p>
            <div className="hf-builder__select-wrap">
              <select
                className="hf-builder__native-select"
                value={cell.legendVisibility || "all"}
                onChange={(event) =>
                  onChange({
                    legendVisibility: event.target.value as HfGridCell["legendVisibility"],
                  })
                }
              >
                {HF_LEGEND_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>

            <p className="hf-builder__field-label" style={{ marginTop: 10 }}>
              Sort
            </p>
            <div className="hf-builder__select-wrap">
              <select
                className="hf-builder__native-select"
                value={cell.legendSort || "default"}
                onChange={(event) =>
                  onChange({ legendSort: event.target.value as HfGridCell["legendSort"] })
                }
              >
                {HF_LEGEND_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>

            <p className="hf-builder__field-label" style={{ marginTop: 10 }}>
              Columns
            </p>
            <div className="hf-builder__legend-cols">
              {HF_LEGEND_COLUMN_CONTENT_OPTIONS.map((option) => {
                const checked = (cell.legendColumnDefs?.length
                  ? cell.legendColumnDefs
                  : defaultLegendColumnDefs()
                ).some((def) => def.content === option.value);
                return (
                  <label key={option.value} className="hf-builder__legend-col">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLegendColumn(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="hf-builder__twocol" style={{ marginTop: 10 }}>
              <div>
                <p className="hf-builder__field-label">Max rows</p>
                <div className="hf-builder__wfield">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Auto"
                    value={cell.legendMaxRows ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      onChange({
                        legendMaxRows: raw === "" ? null : Math.max(0, Number(raw) || 0) || null,
                      });
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="hf-builder__field-label">Image height</p>
                <div className="hf-builder__wfield">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Auto"
                    value={cell.legendImageHeightPx ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      onChange({
                        legendImageHeightPx:
                          raw === "" ? null : Math.max(0, Number(raw) || 0) || null,
                      });
                    }}
                  />
                  <span className="hf-builder__wfield-u">px</span>
                </div>
              </div>
            </div>

            <p className="hf-builder__field-label" style={{ marginTop: 10 }}>
              Label align
            </p>
            <div className="hf-builder__select-wrap">
              <select
                className="hf-builder__native-select"
                value={cell.legendTextAlign || "left"}
                onChange={(event) =>
                  onChange({
                    legendTextAlign: event.target.value as HfGridCell["legendTextAlign"],
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
              <ChevronDownIcon />
            </div>
          </div>
        ) : null}

        {target.widthPx !== undefined && target.onWidthPxChange ? (
          <div className="hf-builder__props-group">
            <p className="hf-builder__group-label">Frame Width</p>
            <div className="hf-builder__wfield">
              <input
                type="number"
                min={20}
                max={400}
                step={1}
                value={Math.round(target.widthPx)}
                onChange={(event) =>
                  target.onWidthPxChange?.(Number(event.target.value) || target.widthPx || 0)
                }
              />
              <span className="hf-builder__wfield-u">px</span>
            </div>
          </div>
        ) : null}

        <div className="hf-builder__props-group">
          <div className="hf-builder__twocol">
            <div>
              <p className="hf-builder__field-label">Background</p>
              <input
                type="color"
                className="hf-builder__color-input"
                value={cell.backgroundColor === "transparent" ? "#ffffff" : cell.backgroundColor}
                onChange={(event) => onChange({ backgroundColor: event.target.value })}
              />
            </div>
            <div>
              <p className="hf-builder__field-label">Padding</p>
              <div className="hf-builder__select-wrap">
                <select
                  className="hf-builder__native-select"
                  value={cell.padding}
                  onChange={(event) => onChange({ padding: Number(event.target.value) })}
                >
                  {Array.from(new Set([...PADDING_OPTIONS, cell.padding]))
                    .sort((a, b) => a - b)
                    .map((value) => (
                      <option key={value} value={value}>
                        {value}px
                      </option>
                    ))}
                </select>
                <ChevronDownIcon />
              </div>
            </div>
          </div>
        </div>

        <div className="hf-builder__props-group hf-builder__props-group--last">
          <p className="hf-builder__group-label">
            Borders{" "}
            {target.syncBorders ? (
              <span className="hf-builder__group-label-muted">(syncs adjacent cells)</span>
            ) : null}
          </p>

          <div className="hf-builder__border-presets">
            <button
              type="button"
              className={`hf-builder__bbtn${allBordersOn ? " is-on" : ""}`}
              title="Show all borders"
              aria-label="Show all borders"
              onClick={() => setAllBorders(true)}
            >
              <BorderIcon variant="all" />
            </button>
            <button
              type="button"
              className={`hf-builder__bbtn${cell.borderTop ? " is-on" : ""}`}
              title="Toggle top border"
              aria-label="Toggle top border"
              onClick={() => toggleSide("borderTop")}
            >
              <BorderIcon variant="top" />
            </button>
            <button
              type="button"
              className={`hf-builder__bbtn${cell.borderBottom ? " is-on" : ""}`}
              title="Toggle bottom border"
              aria-label="Toggle bottom border"
              onClick={() => toggleSide("borderBottom")}
            >
              <BorderIcon variant="bottom" />
            </button>
            <button
              type="button"
              className={`hf-builder__bbtn${cell.borderLeft ? " is-on" : ""}`}
              title="Toggle left border"
              aria-label="Toggle left border"
              onClick={() => toggleSide("borderLeft")}
            >
              <BorderIcon variant="left" />
            </button>
            <button
              type="button"
              className={`hf-builder__bbtn${cell.borderRight ? " is-on" : ""}`}
              title="Toggle right border"
              aria-label="Toggle right border"
              onClick={() => toggleSide("borderRight")}
            >
              <BorderIcon variant="right" />
            </button>
            <div className="hf-builder__bdiv" />
            <button
              type="button"
              className={`hf-builder__bbtn${noBorders ? " is-on" : ""}`}
              title="Hide all borders"
              aria-label="Hide all borders"
              onClick={() => setAllBorders(false)}
            >
              <BorderIcon variant="none" />
            </button>
          </div>

          <div className="hf-builder__threecol">
            <div>
              <p className="hf-builder__field-label">Width</p>
              <div className="hf-builder__wfield">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={cell.borderWidth}
                  onChange={(event) =>
                    onChange({ borderWidth: Math.max(0, Number(event.target.value) || 0) })
                  }
                />
                <span className="hf-builder__wfield-u">px</span>
              </div>
            </div>
            <div>
              <p className="hf-builder__field-label">Color</p>
              <input
                type="color"
                className="hf-builder__color-input"
                value={cell.borderColor}
                onChange={(event) => onChange({ borderColor: event.target.value })}
              />
            </div>
            <div>
              <p className="hf-builder__field-label">Style</p>
              <div className="hf-builder__select-wrap">
                <select
                  className="hf-builder__native-select"
                  value={cell.borderStyle}
                  onChange={(event) =>
                    onChange({ borderStyle: event.target.value as HfGridCell["borderStyle"] })
                  }
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DynamicStringBuilderModal
        open={stringBuilderOpen}
        value={cell.content}
        onClose={() => setStringBuilderFor(null)}
        onSave={(next) => onChange({ content: next, type: "text" })}
      />
    </aside>
  );
}

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ContentTypeIcon({ type }: { type: HfCellType }) {
  if (type === "text") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
        <path d="M5 7V5h14v2M12 5v14M9 19h6" />
      </svg>
    );
  }
  if (type === "image") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5L5 20" />
      </svg>
    );
  }
  if (type === "legend") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
        <path d="M3 16c3 0 3-8 6-8s2.5 8 5.5 8 3-5 6.5-5" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function BorderIcon({
  variant,
}: {
  variant: "all" | "top" | "bottom" | "left" | "right" | "none";
}) {
  const dashed = { ...strokeProps, strokeDasharray: "2 2", strokeWidth: 1 };
  if (variant === "all") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    );
  }
  if (variant === "top" || variant === "bottom") {
    const solidY = variant === "top" ? 3 : 21;
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        {[3, 9, 15, 21].map((y) =>
          y === solidY ? (
            <line key={y} x1="3" y1={y} x2="21" y2={y} {...strokeProps} strokeWidth={2.2} />
          ) : (
            <line key={y} x1="3" y1={y} x2="21" y2={y} {...dashed} />
          )
        )}
      </svg>
    );
  }
  if (variant === "left" || variant === "right") {
    const solidX = variant === "left" ? 3 : 21;
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        {[3, 9, 15, 21].map((x) =>
          x === solidX ? (
            <line key={x} x1={x} y1="3" x2={x} y2="21" {...strokeProps} strokeWidth={2.2} />
          ) : (
            <line key={x} x1={x} y1="3" x2={x} y2="21" {...dashed} />
          )
        )}
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="3" y1="3" x2="3" y2="21" {...dashed} />
      <line x1="21" y1="3" x2="21" y2="21" {...dashed} />
      <line x1="3" y1="3" x2="21" y2="3" {...dashed} />
      <line x1="3" y1="21" x2="21" y2="21" {...dashed} />
    </svg>
  );
}

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  const middle =
    align === "left"
      ? { x1: 3, x2: 15 }
      : align === "center"
        ? { x1: 6, x2: 18 }
        : { x1: 9, x2: 21 };
  const lower =
    align === "left"
      ? { x1: 3, x2: 18 }
      : align === "center"
        ? { x1: 4, x2: 20 }
        : { x1: 6, x2: 21 };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1={middle.x1} y1="12" x2={middle.x2} y2="12" />
      <line x1={lower.x1} y1="18" x2={lower.x2} y2="18" />
    </svg>
  );
}

function VerticalAlignIcon({ align }: { align: "top" | "middle" | "bottom" }) {
  if (align === "top") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
        <line x1="3" y1="3" x2="21" y2="3" />
        <path d="M8 7v13M16 7v13M8 13h8" />
      </svg>
    );
  }
  if (align === "bottom") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
        <line x1="3" y1="21" x2="21" y2="21" />
        <path d="M8 17V4M16 17V4M8 11h8" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M8 5v14M16 5v14" />
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <path d="M6 4h8a4 4 0 0 1 0 8H6ZM6 12h9a4 4 0 0 1 0 8H6Z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  );
}

function TuneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="13" cy="18" r="2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <path d="M18 3a2 2 0 0 1 0 4L8.5 16.5l-3.5.5.5-3.5L18 3Z" />
      <path d="m15 6 3 3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      {...strokeProps}
      className="hf-builder__select-arrow"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
