import type { ReactNode } from "react";

interface IconNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: ReactNode;
  placeholder: string;
  helperText: string;
  required?: boolean;
}

export default function IconNumberField({
  label,
  value,
  onChange,
  icon,
  placeholder,
  helperText,
  required,
}: IconNumberFieldProps) {
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text text-xs font-medium">
          {label} {required && <span className="text-error">*</span>}
        </span>
      </label>
      <div className="relative">
        <input
          type="number"
          className="input input-bordered w-full pl-9"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          min={1}
          required={required}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {icon}
        </span>
      </div>
      <span className="text-[11px] text-base-content/40 mt-1">{helperText}</span>
    </div>
  );
}
