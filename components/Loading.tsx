import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    fullScreen?: boolean;
}

const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message,
    fullScreen = false
}) => {
    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <motion.div
                className={`${sizeClasses[size]} border-3 border-[#FF6B00] border-t-transparent rounded-full`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ borderWidth: size === 'sm' ? '2px' : '3px' }}
            />
            {message && (
                <p className="text-[#B3B3B3] text-sm animate-pulse">{message}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-[#0E0E0E]/80 flex items-center justify-center z-50 backdrop-blur-sm">
                {spinner}
            </div>
        );
    }

    return spinner;
};

// Skeleton loader for cards
export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
    <div className="bg-[#1C1C1C] rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-[#2E2E2E] rounded w-3/4 mb-3" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
            <div key={i} className="h-3 bg-[#2E2E2E] rounded w-full mb-2" />
        ))}
    </div>
);

// Skeleton loader for list items
export const SkeletonListItem: React.FC = () => (
    <div className="flex items-center gap-3 p-3 bg-[#1C1C1C] rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-[#2E2E2E] rounded-full" />
        <div className="flex-1">
            <div className="h-4 bg-[#2E2E2E] rounded w-1/3 mb-2" />
            <div className="h-3 bg-[#2E2E2E] rounded w-2/3" />
        </div>
    </div>
);

// Skeleton loader for table rows
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
    <tr className="animate-pulse">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="p-3">
                <div className="h-4 bg-[#2E2E2E] rounded w-full" />
            </td>
        ))}
    </tr>
);

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    loading = false,
    children,
    disabled,
    className = '',
    ...props
}) => (
    <button
        {...props}
        disabled={loading || disabled}
        className={`relative ${className} ${loading ? 'opacity-70 cursor-wait' : ''}`}
    >
        {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="sm" />
            </span>
        )}
        <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
);

export default LoadingSpinner;
