import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { SunIcon, MoonIcon } from './icons';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`relative w-10 h-10 rounded-lg p-2 transition-all duration-300 hover:bg-[#2E2E2E]/50 flex items-center justify-center overflow-hidden ${className}`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Modo ${isDark ? 'claro' : 'escuro'}`}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isDark ? 'dark' : 'light'}
                    initial={{ y: isDark ? -20 : 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: isDark ? 20 : -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isDark ? (
                        <MoonIcon className="w-6 h-6 text-[#FF6B00]" />
                    ) : (
                        <SunIcon className="w-6 h-6 text-[#1A1A1A]" />
                    )}
                </motion.div>
            </AnimatePresence>
        </button>
    );
};

export default ThemeToggle;
