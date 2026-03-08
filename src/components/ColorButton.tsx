import type { ButtonHTMLAttributes } from 'react';

interface ColorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the button is in the active/selected state */
  active: boolean;
  /** Accent color for border, background (active), and text (inactive). Omit to use DaisyUI btn-neutral. */
  color?: string;
  /** Text color when active (defaults to '#fff') */
  contentColor?: string;
  /** Text alignment — 'start' for left-aligned labels, 'center' (default) for toggles */
  align?: 'start' | 'center';
}

export default function ColorButton({
  active,
  color,
  contentColor = '#fff',
  align = 'center',
  className = '',
  style,
  children,
  ...rest
}: ColorButtonProps) {
  const alignClass = align === 'start' ? 'justify-start' : '';

  // When no custom color, fall back to DaisyUI btn-neutral
  if (!color) {
    return (
      <button
        className={`btn btn-sm btn-neutral ${active ? '' : 'btn-outline'} ${alignClass} ${className}`}
        style={style}
        {...rest}>
        {children}
      </button>
    );
  }

  return (
    <button
      className={`btn btn-sm ${active ? '' : 'btn-outline'} ${alignClass} ${className}`}
      style={{
        ...(active
          ? { backgroundColor: color, borderColor: color, color: contentColor }
          : { borderColor: color, color }),
        ...style,
      }}
      {...rest}>
      {children}
    </button>
  );
}
