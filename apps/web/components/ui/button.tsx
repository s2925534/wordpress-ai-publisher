import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'secondary' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-slate-950 text-white hover:bg-slate-800',
  secondary: 'bg-slate-100 text-slate-950 hover:bg-slate-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100'
};

export function Button({ className, variant = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
