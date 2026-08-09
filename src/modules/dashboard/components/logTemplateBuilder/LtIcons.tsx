import type { ReactNode } from "react";

type IconProps = Readonly<{ size?: number }>;

function Icon({ size = 18, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function DocumentIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 2.5L18.5 9H14V4.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h4v2H8V9z" />
    </Icon>
  );
}

export function DragIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </Icon>
  );
}

export function FontSizeIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M5.55446 22H3.40039L11.0004 3H13.0004L20.6004 22H18.4463L16.0463 16H7.95446L5.55446 22ZM8.75446 14H15.2463L12.0004 5.88517L8.75446 14Z" />
    </Icon>
  );
}

export function BoldIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z" />
    </Icon>
  );
}

export function ItalicIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z" />
    </Icon>
  );
}

export function AlignLeftIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 4H21V6H3V4ZM3 19H17V21H3V19ZM3 14H21V16H3V14ZM3 9H17V11H3V9Z" />
    </Icon>
  );
}

export function AlignCenterIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 4H21V6H3V4ZM5 19H19V21H5V19ZM3 14H21V16H3V14ZM5 9H19V11H5V9Z" />
    </Icon>
  );
}

export function AlignRightIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 4H21V6H3V4ZM7 19H21V21H7V19ZM3 14H21V16H3V14ZM7 9H21V11H7V9Z" />
    </Icon>
  );
}

export function AlignJustifyIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M15 18H16.5C17.8807 18 19 16.8807 19 15.5C19 14.1193 17.8807 13 16.5 13H3V11H16.5C18.9853 11 21 13.0147 21 15.5C21 17.9853 18.9853 20 16.5 20H15V22L11 19L15 16V18ZM3 4H21V6H3V4ZM9 18V20H3V18H9Z" />
    </Icon>
  );
}

export function AlignTopIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 3h18v2H3V3zm4 5h10v3H7V8zm0 5h10v3H7v-3z" />
    </Icon>
  );
}

export function AlignMiddleIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M7 4h10v3H7V4zm-4 7h18v2H3v-2zm4 6h10v3H7v-3z" />
    </Icon>
  );
}

export function AlignBottomIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M7 5h10v3H7V5zm0 5h10v3H7v-3zm-4 8h18v2H3v-2z" />
    </Icon>
  );
}

export function TextVerticalIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M13 3v14.17l2.59-2.58L17 16l-5 5-5-5 1.41-1.41L11 17.17V3h2z" />
      <path d="M3 3h6v2H3V3z" />
    </Icon>
  );
}

export function TextHorizontalIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 11h14.17l-2.58-2.59L16 7l5 5-5 5-1.41-1.41L17.17 13H3v-2z" />
      <path d="M3 3h2v6H3V3z" />
    </Icon>
  );
}

export function WrapTextIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 5h18v2H3V5zm0 12h6v2H3v-2zm0-6h13a3.5 3.5 0 010 7h-2v2l-3.5-3 3.5-3v2h2a1.5 1.5 0 000-3H3v-2z" />
    </Icon>
  );
}
