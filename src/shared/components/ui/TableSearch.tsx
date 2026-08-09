"use client";

import { Input } from "./Input";

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type TableSearchProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}>;

export function TableSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
}: TableSearchProps) {
  return (
    <label className="asset-card__search">
      <SearchIcon />
      <Input
        variant="ui"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
      />
    </label>
  );
}
