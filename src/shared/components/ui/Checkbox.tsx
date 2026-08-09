import { useEffect, useRef, type InputHTMLAttributes } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  indeterminate?: boolean;
};

export function Checkbox({ className = "", indeterminate = false, ...props }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={`ui-checkbox ${className}`.trim()}>
      <input ref={inputRef} type="checkbox" className="ui-checkbox__input" {...props} />
      <span className="ui-checkbox__box" aria-hidden="true" />
    </label>
  );
}
