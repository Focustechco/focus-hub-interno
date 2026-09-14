import React, { useState } from 'react';
import { TaskTag } from '../types';
import { XIcon, PlusIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

// Predefined tag colors
export const TAG_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#FF6B00', // Orange (brand)
    '#9B59B6', // Purple
];

interface TagBadgeProps {
    tag: TaskTag;
    onRemove?: () => void;
    size?: 'sm' | 'md';
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, size = 'md' }) => {
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full ${sizeClasses} font-medium`}
            style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`
            }}
        >
            {tag.name}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="hover:bg-white/20 rounded-full p-0.5"
                >
                    <XIcon className="w-3 h-3" />
                </button>
            )}
        </span>
    );
};

interface TagSelectorProps {
    selectedTags: TaskTag[];
    availableTags: TaskTag[];
    onAddTag: (tag: TaskTag) => void;
    onRemoveTag: (tagId: string) => void;
    onCreateTag: (tag: TaskTag) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
    selectedTags,
    availableTags,
    onAddTag,
    onRemoveTag,
    onCreateTag,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

    const unselectedTags = availableTags.filter(
        t => !selectedTags.some(st => st.id === t.id)
    );

    const handleCreateTag = () => {
        if (!newTagName.trim()) return;

        const newTag: TaskTag = {
            id: `tag-${Date.now()}`,
            name: newTagName.trim(),
            color: selectedColor,
        };
        onCreateTag(newTag);
        setNewTagName('');
        setIsOpen(false);
    };

    return (
        <div className="space-y-2">
            {/* Selected tags */}
            <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                    <TagBadge
                        key={tag.id}
                        tag={tag}
                        onRemove={() => onRemoveTag(tag.id)}
                    />
                ))}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#2E2E2E] text-[#B3B3B3] hover:bg-[#3E3E3E] transition-colors"
                >
                    <PlusIcon className="w-3 h-3" />
                    Adicionar Tag
                </button>
            </div>

            {/* Tag selector dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-[#2E2E2E] rounded-lg p-3 space-y-3"
                    >
                        {/* Existing tags */}
                        {unselectedTags.length > 0 && (
                            <div>
                                <p className="text-xs text-[#B3B3B3] mb-2">Tags existentes:</p>
                                <div className="flex flex-wrap gap-2">
                                    {unselectedTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => {
                                                onAddTag(tag);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <TagBadge tag={tag} size="sm" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Create new tag */}
                        <div className="border-t border-[#3E3E3E] pt-3">
                            <p className="text-xs text-[#B3B3B3] mb-2">Criar nova tag:</p>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Nome da tag"
                                    className="flex-1 bg-[#1C1C1C] text-white text-sm rounded px-2 py-1 border border-transparent focus:border-[#FF6B00]"
                                    maxLength={20}
                                />
                                <button
                                    onClick={handleCreateTag}
                                    disabled={!newTagName.trim()}
                                    className="bg-[#FF6B00] hover:bg-[#FF8C33] disabled:bg-[#3E3E3E] text-white text-sm px-3 py-1 rounded"
                                >
                                    Criar
                                </button>
                            </div>
                            <div className="flex gap-1">
                                {TAG_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-6 h-6 rounded-full ${selectedColor === color ? 'ring-2 ring-white' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TagSelector;
