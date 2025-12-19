import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Role, Sector } from '../types';
import { XIcon, CameraIcon } from './icons';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToEdit: User;
    onSave: (user: User) => void;
    currentUserRole: Role;
}

const SECTORS: Sector[] = ['Comercial', 'Criativo', 'Tech', 'Administração', 'Financeiro'];

interface FormErrors {
    name?: string;
    jobTitle?: string;
    bio?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userToEdit, onSave, currentUserRole }) => {
    const [formData, setFormData] = useState<Partial<User>>(userToEdit);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(userToEdit.avatarUrl);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(userToEdit);
            setAvatarPreview(userToEdit.avatarUrl);
            setErrors({});
        }
    }, [isOpen, userToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof FormErrors];
                return newErrors;
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setAvatarPreview(dataUrl);
                setFormData({ ...formData, avatarUrl: dataUrl });
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const validate = () => {
        const newErrors: FormErrors = {};
        if (!formData.name?.trim()) newErrors.name = 'O nome não pode ficar em branco.';
        if (!formData.jobTitle?.trim()) newErrors.jobTitle = 'O cargo não pode ficar em branco.';
        if (!formData.bio?.trim()) newErrors.bio = 'A bio não pode ficar em branco.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }
        setIsSaving(true);
        setTimeout(() => {
            onSave(formData as User);
            setIsSaving(false);
            onClose();
        }, 1000); // Simulate API call
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="bg-[#1C1C1C] rounded-2xl shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-white">Meu Perfil</h2>
                        
                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-3 -mr-3">
                            <div className="flex items-center space-x-6">
                                <div className="relative">
                                    <img src={avatarPreview || userToEdit.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-[#FF6B00] p-2 rounded-full text-white hover:bg-[#FF8C33] transition-transform transform hover:scale-110"
                                        title="Alterar foto"
                                    >
                                        <CameraIcon className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex-grow">
                                    <label className="block text-sm font-medium text-[#B3B3B3]">Nome de exibição</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleChange}
                                        className={`w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border ${errors.name ? 'border-red-500' : 'border-transparent'} focus:border-[#FF6B00] focus:ring-0 transition-colors`}
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Cargo/Função</label>
                                <input
                                    type="text"
                                    name="jobTitle"
                                    placeholder="Ex: Gestor de Projetos"
                                    value={formData.jobTitle || ''}
                                    onChange={handleChange}
                                    className={`w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border ${errors.jobTitle ? 'border-red-500' : 'border-transparent'} focus:border-[#FF6B00] focus:ring-0 transition-colors`}
                                />
                                {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Setor</label>
                                <select
                                    name="sector"
                                    value={formData.sector || ''}
                                    onChange={handleChange}
                                    disabled={currentUserRole !== Role.ADMIN && userToEdit.id !== 'u1'} // Example of restriction, could be more dynamic
                                    className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border border-transparent focus:border-[#FF6B00] focus:ring-0 disabled:opacity-50"
                                >
                                    {SECTORS.map(sector => (
                                        <option key={sector} value={sector}>{sector}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Mini bio</label>
                                <textarea
                                    name="bio"
                                    rows={3}
                                    placeholder="Transformando ideias em resultados 🚀"
                                    value={formData.bio || ''}
                                    onChange={handleChange}
                                    className={`w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border ${errors.bio ? 'border-red-500' : 'border-transparent'} focus:border-[#FF6B00] focus:ring-0 resize-none transition-colors`}
                                />
                                {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                            </div>
                            
                             <div className="text-sm text-[#B3B3B3]">
                                <span className="font-semibold">Na equipe desde:</span> {formData.joinDate ? new Date(formData.joinDate).toLocaleDateString('pt-BR') : 'N/A'}
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-6 mt-auto border-t border-[#2E2E2E]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 mr-2 bg-[#2E2E2E] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="px-6 py-2 bg-[#FF6B00] rounded-lg text-white font-semibold hover:bg-[#FF8C33] transition-colors disabled:opacity-50 flex items-center"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Salvando...
                                    </>
                                ) : 'Salvar'}
                            </button>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ProfileModal;
