"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

type FileUploadProps = Readonly<{
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
  maxSizeMb?: number;
  id?: string;
  disabled?: boolean;
  className?: string;
}>;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0l4 4m-4-4L8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FileUpload({
  value,
  onChange,
  accept = "image/*",
  hint = "PNG, JPG or SVG up to 5 MB",
  maxSizeMb = 5,
  id,
  disabled = false,
  className = "",
}: FileUploadProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !value.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFile = (file: File | null) => {
    if (!file || disabled) return;

    if (accept.includes("image") && !file.type.startsWith("image/")) {
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      return;
    }

    onChange(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const handleRemove = () => {
    if (disabled) return;
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={["ui-file-upload", className].filter(Boolean).join(" ")}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="ui-file-upload__input"
        onChange={handleInputChange}
      />

      {value ? (
        <div className="ui-file-upload__preview">
          <div className="ui-file-upload__preview-media">
            {previewUrl ? (
              <img src={previewUrl} alt={value.name} className="ui-file-upload__image" />
            ) : (
              <div className="ui-file-upload__file-icon">
                <ImageIcon />
              </div>
            )}
          </div>

          <div className="ui-file-upload__meta">
            <p className="ui-file-upload__name">{value.name}</p>
            <p className="ui-file-upload__size">{formatFileSize(value.size)}</p>
          </div>

          <div className="ui-file-upload__actions">
            <button
              type="button"
              className="ui-btn ui-btn--outline ui-btn--sm"
              onClick={openFilePicker}
              disabled={disabled}
            >
              Replace
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--ghost ui-btn--sm"
              onClick={handleRemove}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-label="Upload logo"
          className={[
            "ui-file-upload__dropzone",
            isDragging ? "is-dragging" : "",
            disabled ? "is-disabled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span className="ui-file-upload__icon">
            <UploadIcon />
          </span>
          <p className="ui-file-upload__title">
            Drag and drop your logo here, or <span>browse files</span>
          </p>
          {hint ? <p className="ui-file-upload__hint">{hint}</p> : null}
        </div>
      )}
    </div>
  );
}
