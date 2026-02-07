import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    label: string; // For aria-label
    variant?: 'default' | 'accent';
    active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ icon, label, variant = 'default', active = false, className = '', ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        const variantStyles = {
            default: active
                ? 'bg-accent text-white'
                : 'text-app-foreground hover:bg-app-border/50',
            accent: 'text-accent hover:bg-accent-light/20',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variantStyles[variant]} ${className}`}
                aria-label={label}
                title={label}
                {...props}
            >
                {icon}
            </button>
        );
    }
);

IconButton.displayName = 'IconButton';
