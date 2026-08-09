type GraphicCodeLabelProps = Readonly<{
  text: string;
  tooltip?: string;
  className?: string;
}>;

export function GraphicCodeLabel({ text, tooltip, className }: GraphicCodeLabelProps) {
  if (!text) return null;

  const fullText = tooltip ?? text;

  return (
    <span
      className={`log-config-class-graphic-label${className ? ` ${className}` : ""}`}
      title={fullText}
    >
      <span className="log-config-class-graphic-label__text">{text}</span>
      <span className="log-config-class-graphic-label__tooltip">{fullText}</span>
    </span>
  );
}
