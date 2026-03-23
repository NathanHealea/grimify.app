import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type ButtonVariant = 'default' | 'outline' | 'ghost';
export type ButtonColor = 'default' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'citadel'| 'army-painter' | 'vallejo' | 'green-stuff-world' | 'complementary' | 'split' | 'analogous' | (string & {});
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonShape = 'default' | 'circle';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  shape?: ButtonShape;
  block?: boolean;
  customColor?: string;
  customContentColor?: string;
  active?: boolean;
}

export default function Button({
  variant = 'default',
  color = 'default',
  size = 'md',
  shape = 'default',
  block,
  customColor,
  customContentColor = '#fff',
  active,
  className,
  style,
  children,
  ...rest
}: ButtonProps) {
  const btnBase = 'btn';
  const btnVariant = variant !== 'default' ? `btn-${variant}` : '';
  const btnColor = color !== 'default' ? `btn-${color}` : '';
  const btnSize = `btn-${size}`;
  const btnShape = shape !== 'default' ? `btn-${shape}` : '';
  const btnActive = active ? 'btn-active' : '';
  const btnBlock = block ? 'btn-block' : '';

  let computedStyle: React.CSSProperties | undefined = style;
  if (customColor) {
    if (active) {
      computedStyle = {
        backgroundColor: customColor,
        borderColor: customColor,
        color: customContentColor,
        ...style,
      };
    } else {
      computedStyle = {
        borderColor: customColor,
        color: customColor,
        ...style,
      };
    }
  }

  return (
    <button
      className={clsx(btnBase, btnVariant, btnColor, btnSize, btnShape, btnActive, btnBlock, className)}
      style={computedStyle}
      {...rest}>
      {children}
    </button>
  );
}
