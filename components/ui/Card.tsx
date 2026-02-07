import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outlined' | 'ghost';
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
    const baseStyles = 'rounded-lg transition-all duration-200';

    const variantStyles = {
        default: 'bg-app-background shadow-sm border border-app-border',
        outlined: 'border border-app-border',
        ghost: 'hover:bg-app-border/50',
    };

    return (
        <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
            {children}
        </div>
    );
}
