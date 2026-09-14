import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOffIcon } from './icons';

interface OfflineIndicatorProps {
    isOnline: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline }) => {
    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 border border-yellow-500"
                >
                    <CloudOffIcon className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-sm">Você está offline. As alterações serão salvas localmente.</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineIndicator;
