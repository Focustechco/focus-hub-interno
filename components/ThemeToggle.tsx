import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`relative w-10 h-10 rounded-lg p-2 transition-all duration-300 hover:bg-[#2E2E2E]/50 ${className}`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Modo ${isDark ? 'claro' : 'escuro'}`}
        >
            <motion.div
                className="relative w-full h-full"
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
                {/* Minimalist circle icon */}
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`w-full h-full transition-colors duration-300 ${isDark ? 'text-[#FF6B00]' : 'text-[#1A1A1A]'}`}
                >
                    {/* Main circle */}
                    <circle cx="12" cy="12" r="5" />

                    {/* Rays (visible in light mode style) */}
                    <motion.g
                        animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0.5 : 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </motion.g>

                    {/* Moon crescent (visible in dark mode) */}
                    <motion.path
                        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                        fill={isDark ? 'currentColor' : 'none'}
                        animate={{
                            opacity: isDark ? 1 : 0,
                            pathLength: isDark ? 1 : 0
                        }}
                        transition={{ duration: 0.3 }}
                    />
                </svg>
            </motion.div>
        </button>
    );
};

export default ThemeToggle;
