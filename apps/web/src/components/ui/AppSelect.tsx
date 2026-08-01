import type { SelectHTMLAttributes } from "react";

type AppSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  containerClassName?: string;
};

export function AppSelect({ containerClassName = "", children, ...props }: AppSelectProps) {
  return (
    <span className={`app-select ${containerClassName}`.trim()}>
      <select {...props}>{children}</select>
      <span className="app-select__chevron" aria-hidden="true">⌄</span>
    </span>
  );
}
