import React, { useState, useMemo, useEffect } from 'react';
import api from '../services/api';
import { LinkItem, ContentItem, ContentType, ContentCategory, AccessGroup, AccessLink, User, Role } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CameraIcon, CodeIcon, EditIcon, ExternalLinkIcon, FileTextIcon, GlobeIcon, NewspaperIcon,
    PlusIcon, SearchIcon, StarIcon, TargetIcon, Trash2Icon, UserIcon, XIcon, BookOpenIcon, AwardIcon, FileCodeIcon, SettingsIcon, LinkIcon, LockIcon, FolderIcon, FolderOpenIcon,
    InstagramIcon, LinkedinIcon, FacebookIcon, YoutubeIcon, TwitterIcon, WhatsappIcon, TelegramIcon, PinterestIcon, ThreadsIcon, TiktokIcon, GithubIcon, VercelIcon, MicIcon, BarChartIcon, ClickupIcon
} from '../components/icons';
import { useToast } from '../components/Toast';
import * as LucideIcons from 'lucide-react';
import DiscordAdminPanel from '../components/DiscordAdminPanel';

const MOCK_LINKS: LinkItem[] = [
    { id: 'tool-1', title: 'Focus Site', description: 'Acesso ao site institucional da Focus Tecnologia.', link: 'https://focusmarketing.com', icon: 'Globe', isFavorite: true },
    { id: 'tool-2', title: 'Focus Contrato', description: 'Plataforma de geração e assinatura de contratos.', link: '#', icon: 'FileText', isFavorite: false },
    { id: 'tool-3', title: 'Focus Estúdios', description: 'Setor audiovisual (produção de vídeo, social media).', link: '#', icon: 'Camera', isFavorite: true },
    { id: 'tool-4', title: 'Focus Tech', description: 'Desenvolvimento de sistemas e automações.', link: '#', icon: 'Code', isFavorite: false },
    { id: 'tool-5', title: 'Focus News', description: 'Portal de notícias e atualizações da empresa.', link: '#', icon: 'Newspaper', isFavorite: false },
    { id: 'tool-6', title: 'Painel Equipe', description: 'Links internos, dashboards e relatórios.', link: '#', icon: 'User', isFavorite: true },
    { id: 'social-1', title: 'Instagram', description: '@focus.tecnologia', link: 'https://instagram.com/', icon: 'Instagram', category: 'Social' },
    { id: 'social-2', title: 'LinkedIn', description: 'Página oficial no LinkedIn', link: 'https://linkedin.com/', icon: 'LinkedIn', category: 'Social' },
    { id: 'social-3', title: 'Facebook', description: 'Nossa fanpage', link: 'https://facebook.com/', icon: 'Facebook', category: 'Social' },
    { id: 'social-4', title: 'YouTube', description: 'Canal Oficial', link: 'https://youtube.com/', icon: 'YouTube', category: 'Social' },
    { id: 'social-5', title: 'X / Twitter', description: 'Acompanhe as novidades', link: 'https://twitter.com/', icon: 'Twitter', category: 'Social' },
];

const MOCK_CONTENT: ContentItem[] = [
    { id: 'c1', title: 'Guia Completo de Onboarding', type: 'E-BOOK', category: 'E-books', link: '#' },
    { id: 'c2', title: 'Treinamento de Liderança - Módulo 1', type: 'TREINAMENTO', category: 'Treinamentos da Equipe', link: '#' },
    { id: 'c3', title: 'Visão, Missão e Valores da Empresa', type: 'DOCUMENTO', category: 'Código de Cultura', link: '#' },
    { id: 'c4', title: 'Curso Básico de Vendas 2025', type: 'CURSO', category: 'Cursos', link: '#' },
    { id: 'c5', title: 'Templates de Apresentação', type: 'DOCUMENTO', category: 'Materiais da Focus', link: '#' },
    { id: 'c6', title: 'Manual de Tom de Voz', type: 'DOCUMENTO', category: 'Código de Cultura', link: '#' },
];

const MOCK_ACCESS_GROUPS: AccessGroup[] = [
    {
        id: 'group-focus',
        name: 'Focus',
        links: [
            { id: 'acc-1', nome: "Canva", link: "https://www.canva.com", icon: 'GlobeIcon', descricao: 'Acesso à conta Pro da Focus para criação de materiais de marketing.', login: 'admin@focus.com', senha: 'securepassword123', isFavorite: true },
            { id: 'acc-2', nome: "Instagram", link: "https://www.instagram.com", icon: 'LinkIcon', descricao: 'Conta principal da Focus Tecnologia.', login: '@focusmarketing', senha: 'securepassword123', isFavorite: false },
        ]
    },
    {
        id: 'group-jk',
        name: 'JK Certificadora',
        links: [
            { id: 'acc-3', nome: "Instagram", link: "#", icon: 'LinkIcon', descricao: "Gerenciar perfil @jkcertificadora. Acesso usado para posts e atendimento via DM.", login: 'jk_social', isFavorite: false },
            { id: 'acc-4', nome: "HostGator", link: "https://www.hostgator.com.br", icon: 'GlobeIcon', descricao: "Painel de hospedagem da JK. Acesso principal ao domínio e emails.", login: 'jk_host', isFavorite: true },
        ]
    }
];

const iconMap: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    Globe: GlobeIcon,
    FileText: FileTextIcon,
    Camera: CameraIcon,
    Code: CodeIcon,
    Newspaper: NewspaperIcon,
    Target: TargetIcon,
    User: UserIcon,
    Link: LinkIcon,
    Instagram: InstagramIcon,
    LinkedIn: LinkedinIcon,
    Facebook: FacebookIcon,
    YouTube: YoutubeIcon,
    Twitter: TwitterIcon,
    WhatsApp: WhatsappIcon,
    Telegram: TelegramIcon,
    Pinterest: PinterestIcon,
    Threads: ThreadsIcon,
    TikTok: TiktokIcon,
    GitHub: GithubIcon,
    Vercel: VercelIcon,
    Mic: MicIcon,
    BarChart: BarChartIcon,
    ClickUp: ClickupIcon,
};
const iconOptions = Object.keys(iconMap);
const socialIconOptions = ['Instagram', 'LinkedIn', 'Facebook', 'YouTube', 'Twitter', 'WhatsApp', 'Telegram', 'Pinterest', 'Threads', 'TikTok'];
const generalIconOptions = iconOptions.filter(icon => !socialIconOptions.includes(icon));

const accessIconMap: { [key in AccessLink['icon']]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    LinkIcon: LinkIcon,
    GlobeIcon: GlobeIcon,
};


interface FocusToolsScreenProps {
    currentUser: User;
}

const FocusToolsScreen: React.FC<FocusToolsScreenProps> = ({ currentUser }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'integrations' | 'links' | 'content' | 'acessos' | 'social'>('acessos');

    // State for Links Tab
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFavorites, setShowFavorites] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
    const [linkModalCategory, setLinkModalCategory] = useState<'General' | 'Social'>('General');

    // State for Content Tab
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');
    const [searchContentTerm, setSearchContentTerm] = useState('');
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
    const [previewContent, setPreviewContent] = useState<ContentItem | null>(null);
    const [contentPage, setContentPage] = useState(1);

    // State for Acessos Tab
    const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AccessGroup | null>(null);

    // Fetch Data
    useEffect(() => {
        // Fetch Links
        api.get('/tools/links')
            .then(res => setLinks(res.data))
            .catch(err => {
                console.error("Failed to fetch links:", err);
                // Show empty state instead of MOCK_DATA
                setLinks([]);
            });

        // Fetch Access Groups
        api.get('/tools/access-groups')
            .then(res => {
                setAccessGroups(res.data);
                if (res.data.length > 0) setOpenGroupId(res.data[0].id);
            })
            .catch(err => {
                console.error("Failed to fetch access groups:", err);
                // Show empty state instead of MOCK_DATA
                setAccessGroups([]);
            });
            
        // Fetch Contents
        api.get('/contents')
            .then(res => setContents(res.data))
            .catch(err => {
                console.error("Failed to fetch contents:", err);
                setContents([]);
            });
    }, []);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [accessModalContext, setAccessModalContext] = useState<{ mode: 'create' | 'edit', groupId: string, link?: AccessLink } | null>(null);

    const handleOpenAccessModal = (context: { mode: 'create' | 'edit', groupId: string, link?: AccessLink }) => {
        setAccessModalContext(context);
        setIsAccessModalOpen(true);
    };

    const handleCloseAccessModal = () => {
        setAccessModalContext(null);
        setIsAccessModalOpen(false);
    };

    const handleSaveAccessLink = async (linkData: Omit<AccessLink, 'id'> & { id?: string }) => {
        if (!accessModalContext) return;

        const { mode, groupId } = accessModalContext;

        try {
            if (mode === 'create') {
                // API Call to create credential
                const res = await api.post(`/tools/access-groups/${groupId}/credentials`, {
                    serviceName: linkData.nome,
                    username: linkData.login,
                    password: linkData.senha,
                    url: linkData.link,
                    notes: linkData.descricao
                });

                // Optimistic / Response update
                const newLink = { ...linkData, id: res.data.id || `acc-${Date.now()}` } as AccessLink;

                setAccessGroups(prevGroups =>
                    prevGroups.map(group =>
                        group.id === groupId ? {
                            ...group,
                            links: [...group.links, newLink]
                        } : group
                    )
                );
            } else if (mode === 'edit' && linkData.id) {
                // API Call to update credential
                const res = await api.put(`/tools/credentials/${linkData.id}`, {
                    serviceName: linkData.nome,
                    username: linkData.login,
                    password: linkData.senha,
                    url: linkData.link,
                    notes: linkData.descricao,
                    isFavorite: linkData.isFavorite
                });

                setAccessGroups(prevGroups =>
                    prevGroups.map(group =>
                        group.id === groupId ? {
                            ...group,
                            links: group.links.map(link =>
                                link.id === linkData.id ? (res.data as AccessLink) : link
                            )
                        } : group
                    )
                );
            }
        } catch (err) {
            console.error("Failed to save access link:", err);
            toast.error("Erro ao salvar acesso.");
            // Fallback to local state update logic if needed
            if (mode === 'edit' && linkData.id) {
                setAccessGroups(prevGroups =>
                    prevGroups.map(group =>
                        group.id === groupId ? {
                            ...group,
                            links: group.links.map(link =>
                                link.id === linkData.id ? (linkData as AccessLink) : link
                            )
                        } : group
                    )
                );
            }
        }

        handleCloseAccessModal();
    };

    const handleDeleteAccessLink = async (linkId: string, groupId: string) => {
        if (!window.confirm("Tem certeza que deseja remover este acesso?")) return;

        try {
            await api.delete(`/tools/credentials/${linkId}`);
            setAccessGroups(prev => prev.map(g => g.id === groupId ? { ...g, links: g.links.filter(l => l.id !== linkId) } : g));
        } catch (err) {
            console.error("Failed to delete access link:", err);
            toast.error("Erro ao remover acesso.");
        }
    };

    const handleOpenGroupModal = (group: AccessGroup | null = null) => {
        setEditingGroup(group);
        setIsGroupModalOpen(true);
    };

    const handleSaveAccessGroup = async (groupData: { name: string, color: string }) => {
        try {
            if (editingGroup) {
                const res = await api.put(`/tools/access-groups/${editingGroup.id}`, { name: groupData.name, color: groupData.color });
                setAccessGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name: res.data.name, color: res.data.color } : g));
            } else {
                const res = await api.post('/tools/access-groups', { name: groupData.name, color: groupData.color });
                const newGroup: AccessGroup = {
                    id: res.data.id,
                    name: res.data.name,
                    color: res.data.color,
                    links: []
                };
                setAccessGroups(prev => [...prev, newGroup]);
                setOpenGroupId(newGroup.id);
            }
        } catch (err: any) {
            toast.error('Erro ao salvar grupo.');
        }
        setIsGroupModalOpen(false);
    };
    const handleDeleteAccessGroup = async (groupId: string) => {
        if (!window.confirm("Tem certeza que deseja remover este grupo? Isso apagará todos os acessos dentro dele.")) return;

        try {
            await api.delete(`/tools/access-groups/${groupId}`);
            setAccessGroups(prev => prev.filter(g => g.id !== groupId));
            if (openGroupId === groupId) setOpenGroupId(null);
        } catch (err) {
            console.error("Failed to delete access group:", err);
            toast.error("Erro ao remover grupo.");
        }
    };


    const filteredLinks = useMemo(() => {
        return links
            .filter(link => {
                if (link.category === 'Social') return false;
                const term = searchTerm.toLowerCase();
                const matchesSearch = link.title.toLowerCase().includes(term) || link.description.toLowerCase().includes(term);
                const matchesFavorite = showFavorites ? link.isFavorite : true;
                return matchesSearch && matchesFavorite;
            })
            .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    }, [links, searchTerm, showFavorites]);

    const socialLinks = useMemo(() => {
        return links.filter(l => l.category === 'Social');
    }, [links]);

    const filteredContent = useMemo(() => {
        let result = contents;
        if (selectedCategory !== 'all') {
            result = result.filter(item => item.category === selectedCategory);
        }
        if (searchContentTerm.trim()) {
            const term = searchContentTerm.toLowerCase();
            result = result.filter(item => item.title.toLowerCase().includes(term));
        }
        return result; // Backend already sorts by order_index ASC
    }, [contents, selectedCategory, searchContentTerm]);

    const handleOpenContentModal = (content: ContentItem | null = null) => {
        setEditingContent(content);
        setIsContentModalOpen(true);
    };

    const handleCloseContentModal = () => {
        setEditingContent(null);
        setIsContentModalOpen(false);
    };

    const handleSaveContent = async (formData: FormData) => {
        try {
            if (editingContent) {
                const res = await api.put(`/contents/${editingContent.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setContents(prev => prev.map(c => c.id === editingContent.id ? res.data : c));
                toast.success('Conteúdo atualizado.');
            } else {
                const res = await api.post('/contents', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setContents(prev => [res.data, ...prev]);
                toast.success('Conteúdo cadastrado com sucesso.');
            }
            handleCloseContentModal();
        } catch (err: any) {
            console.error("Failed to save content:", err);
            toast.error(err.response?.data?.message || "Erro ao salvar conteúdo.");
        }
    };

    const handleDeleteContent = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir este conteúdo?")) return;
        try {
            await api.delete(`/contents/${id}`);
            setContents(prev => prev.filter(c => c.id !== id));
            toast.success('Conteúdo removido.');
        } catch (err: any) {
            console.error("Failed to delete content:", err);
            toast.error(err.response?.data?.message || "Erro ao excluir conteúdo.");
        }
    };

    const handleOpenLinkModal = (link: LinkItem | null, category: 'General' | 'Social' = 'General') => {
        setLinkModalCategory(category);
        setEditingLink(link);
        setIsLinkModalOpen(true);
    };

    const handleCloseLinkModal = () => {
        setEditingLink(null);
        setIsLinkModalOpen(false);
    };

    const handleSaveLink = async (linkData: Omit<LinkItem, 'id' | 'isFavorite'> & { id?: string }) => {
        try {
            if (editingLink) {
                // Update via API
                const res = await api.put(`/tools/links/${editingLink.id}`, {
                    title: linkData.title,
                    description: linkData.description,
                    link: linkData.link,
                    icon: linkData.icon,
                    category: linkModalCategory
                });
                setLinks(prev => prev.map(l => l.id === editingLink.id ? res.data : l));
            } else {
                const res = await api.post('/tools/links', {
                    title: linkData.title,
                    description: linkData.description,
                    link: linkData.link,
                    category: linkModalCategory,
                    icon: linkData.icon,
                    userId: currentUser?.id
                });

                if (res.data) {
                    setLinks(prev => [res.data, ...prev]);
                }
            }
        } catch (err) {
            console.error("Failed to save link:", err);
            toast.error("Erro ao salvar link.");
        }
        handleCloseLinkModal();
    };

    const handleDeleteLink = async (linkId: string) => {
        if (window.confirm("Tem certeza que deseja remover este link?")) {
            try {
                await api.delete(`/tools/links/${linkId}`);
                setLinks(prev => prev.filter(l => l.id !== linkId));
            } catch (err) {
                console.error("Failed to delete link:", err);
                // Fallback
                setLinks(prev => prev.filter(l => l.id !== linkId));
            }
        }
    };

    const handleToggleFavorite = async (linkId: string) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;

        const newFavorite = !link.isFavorite;
        // Optimistic update
        setLinks(prev => prev.map(l => l.id === linkId ? { ...l, isFavorite: newFavorite } : l));

        try {
            await api.put(`/tools/links/${linkId}`, { isFavorite: newFavorite });
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            // Revert
            setLinks(prev => prev.map(l => l.id === linkId ? { ...l, isFavorite: !newFavorite } : l));
        }
    };

    const contentIconMap: { [key in ContentType]: React.FC<any> } = {
        'CURSO': BookOpenIcon,
        'E-BOOK': BookOpenIcon,
        'DOCUMENTO': FileCodeIcon,
        'TREINAMENTO': AwardIcon
    };

    const contentCategoryConfig: { name: ContentCategory; icon: React.FC<any> }[] = [
        { name: 'Cursos', icon: BookOpenIcon },
        { name: 'Materiais da Focus', icon: FileTextIcon },
        { name: 'Código de Cultura', icon: FileCodeIcon },
        { name: 'Treinamentos da Equipe', icon: AwardIcon },
        { name: 'E-books', icon: BookOpenIcon },
    ];

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Ferramentas & Conteúdo</h1>
                <p className="text-[#B3B3B3]">Centralize os principais acessos, materiais e integrações da empresa.</p>
            </header>

            <div className="flex items-center gap-2 border-b border-[#2E2E2E] mb-6 flex-wrap">
                <button onClick={() => setActiveTab('links')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'links' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <LinkIcon className="w-5 h-5" /> Links Focus
                </button>
                <button onClick={() => setActiveTab('content')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'content' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <BookOpenIcon className="w-5 h-5" /> Conteúdo
                </button>
                <button onClick={() => setActiveTab('acessos')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'acessos' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <LockIcon className="w-5 h-5" /> Acessos
                </button>
                <button onClick={() => setActiveTab('social')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'social' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <LucideIcons.Share2 className="w-5 h-5" /> Redes Sociais
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {activeTab === 'links' && <LinksTabContent links={filteredLinks} onToggleFavorite={handleToggleFavorite} onOpenModal={handleOpenLinkModal} onDelete={handleDeleteLink} searchTerm={searchTerm} setSearchTerm={setSearchTerm} showFavorites={showFavorites} setShowFavorites={setShowFavorites} />}
                {activeTab === 'content' && <ContentTabContent 
                    content={filteredContent} 
                    selectedCategory={selectedCategory} 
                    setSelectedCategory={setSelectedCategory} 
                    searchTerm={searchContentTerm}
                    setSearchTerm={setSearchContentTerm}
                    page={contentPage}
                    setPage={setContentPage}
                    categoryConfig={contentCategoryConfig} 
                    isAdmin={currentUser?.role === Role.ADMIN}
                    onOpenModal={handleOpenContentModal}
                    onDelete={handleDeleteContent}
                    onPreview={setPreviewContent}
                />}
                {activeTab === 'acessos' && <AcessosTabContent 
                    accessGroups={accessGroups} 
                    openGroupId={openGroupId} 
                    setOpenGroupId={setOpenGroupId} 
                    onOpenModal={handleOpenAccessModal} 
                    onOpenGroupModal={handleOpenGroupModal} 
                    onDeleteGroup={handleDeleteAccessGroup} 
                    onDeleteLink={handleDeleteAccessLink} 
                />}
                {activeTab === 'social' && <SocialTabContent links={socialLinks} onOpenModal={handleOpenLinkModal} onDelete={handleDeleteLink} />}
            </div>
            {isLinkModalOpen && <LinkModal isOpen={isLinkModalOpen} onClose={handleCloseLinkModal} onSave={handleSaveLink} editingLink={editingLink} category={linkModalCategory} />}
            {isGroupModalOpen && <GroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} onSave={handleSaveAccessGroup} editingGroup={editingGroup} />}
            {isAccessModalOpen && accessModalContext && <AccessModal isOpen={isAccessModalOpen} onClose={handleCloseAccessModal} onSave={handleSaveAccessLink} context={accessModalContext} />}
            {isContentModalOpen && <ContentModal isOpen={isContentModalOpen} onClose={handleCloseContentModal} onSave={handleSaveContent} editingContent={editingContent} />}
            {previewContent && <PreviewModal content={previewContent} onClose={() => setPreviewContent(null)} />}
        </div>
    );
};

const SocialTabContent: React.FC<any> = ({ links, onOpenModal, onDelete }) => {
    const getSocialColor = (iconName: string) => {
        const colors: { [key: string]: string } = {
            Instagram: '#E1306C',
            LinkedIn: '#0A66C2',
            Facebook: '#1877F2',
            YouTube: '#FF0000',
            Twitter: '#1DA1F2',
            WhatsApp: '#25D366',
            Telegram: '#229ED9',
            Pinterest: '#E60023',
            Threads: '#808080',
            TikTok: '#FF0050'
        };
        return colors[iconName] || '#FF6B00';
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold">Redes Sociais Oficiais</h2>
                    <p className="text-[#B3B3B3] text-sm">Acesse e compartilhe os canais da Focus Tecnologia.</p>
                </div>
                <button onClick={() => onOpenModal(null, 'Social')} className="mt-4 sm:mt-0 flex items-center justify-center bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2" /> Adicionar
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {links.map((social: any) => {
                    const Icon = iconMap[social.icon as keyof typeof iconMap] || LinkIcon;
                    const brandColor = getSocialColor(social.icon);
                    return (
                        <div key={social.id} className="relative group" style={{ '--brand-color': brandColor } as React.CSSProperties}>
                            <a href={social.link} target="_blank" rel="noopener noreferrer" className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-6 flex flex-col items-center justify-center hover:bg-[#2A2A2A] hover:border-[color:var(--brand-color)] transition-all h-full block">
                                <div className="p-4 rounded-full mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${brandColor}1A`, color: brandColor }}>
                                    <Icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">{social.title}</h3>
                                {social.description && <p className="text-xs text-[#B3B3B3] mt-2 text-center">{social.description}</p>}
                                <p className="text-sm mt-2 transition-colors text-center opacity-80 group-hover:opacity-100" style={{ color: brandColor }}>Acessar perfil</p>
                            </a>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                <button onClick={(e) => { e.preventDefault(); onOpenModal(social, 'Social'); }} className="p-1.5 bg-[#2E2E2E] hover:bg-[#3a3a3a] text-white rounded shadow-sm">
                                    <EditIcon className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.preventDefault(); onDelete(social.id); }} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded shadow-sm">
                                    <Trash2Icon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )
                })}
                {links.length === 0 && (
                    <div className="col-span-full text-center text-[#B3B3B3] py-16"><p>Nenhuma rede social adicionada.</p></div>
                )}
            </div>
        </div>
    );
};

const LinksTabContent: React.FC<any> = ({ links, onToggleFavorite, onOpenModal, onDelete, searchTerm, setSearchTerm, showFavorites, setShowFavorites }) => (
    <div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:max-w-xs">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B3B3B3]" />
                <input type="text" placeholder="Buscar link..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1C1C1C] text-white rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-[#FF6B00]" />
            </div>
            <div className='flex items-center gap-4 w-full sm:w-auto'>
                <button onClick={() => setShowFavorites((v: any) => !v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${showFavorites ? 'bg-[#FF6B00]/20 text-[#FF8C33]' : 'bg-[#1C1C1C] text-[#B3B3B3]'}`}>
                    <StarIcon className='w-5 h-5' /> Favoritos
                </button>
                <button onClick={() => onOpenModal(null)} className="flex-1 sm:flex-none flex items-center justify-center bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2" /> Adicionar
                </button>
            </div>
        </div>
        {links.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {links.map((link: LinkItem) => <LinkCard key={link.id} link={link} onToggleFavorite={onToggleFavorite} onOpenModal={onOpenModal} onDelete={onDelete} />)}
            </div>
        ) : (
            <div className="text-center text-[#B3B3B3] py-16"><p>Nenhum link encontrado.</p></div>
        )}
    </div>
);

const ContentTabContent: React.FC<any> = ({ content, selectedCategory, setSelectedCategory, searchTerm, setSearchTerm, page, setPage, categoryConfig, isAdmin, onOpenModal, onDelete, onPreview }) => {
    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.ceil(content.length / ITEMS_PER_PAGE);
    const paginatedContent = content.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:max-w-xs">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B3B3B3]" />
                    <input type="text" placeholder="Pesquisar conteúdo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1C1C1C] text-white rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-[#FF6B00]" />
                </div>
                {isAdmin && (
                    <button onClick={() => onOpenModal()} className="w-full sm:w-auto flex items-center justify-center bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adicionar Conteúdo
                    </button>
                )}
            </div>
            
            <div className="mb-6 overflow-x-auto pb-2 -mb-2 custom-scrollbar">
                <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedCategory('all'); setPage(1); }} className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[#FF6B00] text-white' : 'bg-[#1C1C1C] text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}>Todos</button>
                    {categoryConfig.map(({ name, icon: Icon }: any) => (
                        <button key={name} onClick={() => { setSelectedCategory(name); setPage(1); }} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${selectedCategory === name ? 'bg-[#FF6B00] text-white' : 'bg-[#1C1C1C] text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}>
                            <Icon className="w-4 h-4" /> {name}
                        </button>
                    ))}
                </div>
            </div>
            
            {paginatedContent.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedContent.map((item: ContentItem) => <ContentCard key={item.id} item={item} isAdmin={isAdmin} onOpenModal={onOpenModal} onDelete={onDelete} onPreview={onPreview} />)}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-8 gap-2">
                            <button disabled={page === 1} onClick={() => setPage((p: number) => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg bg-[#1C1C1C] text-white disabled:opacity-50">Anterior</button>
                            <span className="px-4 py-2 text-[#B3B3B3]">Página {page} de {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-lg bg-[#1C1C1C] text-white disabled:opacity-50">Próxima</button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center text-[#B3B3B3] py-16"><p>Nenhum conteúdo encontrado nesta categoria.</p></div>
            )}
        </div>
    );
};

const AcessosTabContent: React.FC<any> = ({ accessGroups, openGroupId, setOpenGroupId, onOpenModal, onOpenGroupModal, onDeleteGroup, onDeleteLink }) => (
    <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
            <button onClick={() => onOpenGroupModal()} className="flex items-center justify-center bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors text-sm">
                <PlusIcon className="w-4 h-4 mr-2" /> Criar Novo Grupo
            </button>
        </div>
        <div className="space-y-4">
            {accessGroups.map((group: AccessGroup) => {
                const groupColor = group.color || '#F97316';
                return (
                <div key={group.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg overflow-hidden">
                    <div
                        onClick={() => setOpenGroupId(openGroupId === group.id ? null : group.id)}
                        className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ borderLeft: `4px solid ${groupColor}` }}
                    >
                        <div className="flex items-center gap-3">
                            {openGroupId === group.id ? <FolderOpenIcon className="w-5 h-5" style={{ color: groupColor }} /> : <FolderIcon className="w-5 h-5" style={{ color: groupColor }} />}
                            <span>{group.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-[#B3B3B3]">{group.links.length} links</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenGroupModal(group); }}
                                className="p-1 text-gray-500 hover:text-white hover:bg-[#2E2E2E] rounded transition-colors"
                                title="Editar Grupo"
                            >
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                                className="p-1 text-gray-500 hover:text-red-500 hover:bg-[#2E2E2E] rounded transition-colors"
                                title="Excluir Grupo"
                            >
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <AnimatePresence>
                        {openGroupId === group.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 border-t border-[#2E2E2E] space-y-2 bg-[#1A1A1A]">
                                    {group.links.map((link: AccessLink) => {
                                        const Icon = iconMap[link.icon as string] || LinkIcon;
                                        return (
                                            <div key={link.id} className="w-full flex items-center gap-3 p-3 bg-[#2E2E2E] hover:bg-[#3a3a3a] transition-colors rounded-lg group">
                                                <a href={link.link} target="_blank" rel="noopener noreferrer" className="flex-grow flex items-center gap-3 overflow-hidden" title={link.descricao}>
                                                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: groupColor }} />
                                                    <span className="truncate hover:underline text-white font-medium">{link.nome}</span>
                                                    {link.isFavorite && <StarIcon className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />}
                                                </a>
                                                <button onClick={() => onOpenModal({ mode: 'edit', groupId: group.id, link: link })} className="p-1.5 text-[#B3B3B3] hover:text-white hover:bg-[#1C1C1C] rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Editar">
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDeleteLink(link.id, group.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-[#1C1C1C] rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir">
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => onOpenModal({ mode: 'create', groupId: group.id })} className="w-full flex items-center justify-center gap-2 text-left p-3 mt-2 bg-transparent hover:bg-white/5 transition-colors rounded-lg text-sm font-medium border border-dashed" style={{ color: groupColor, borderColor: groupColor }}>
                                        <PlusIcon className="w-4 h-4" /> Adicionar Acesso
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )})}
        </div>
    </div>
);


const LinkCard: React.FC<{ link: LinkItem, onToggleFavorite: (id: string) => void, onOpenModal: (link: LinkItem) => void, onDelete: (id: string) => void }> = ({ link, onToggleFavorite, onOpenModal, onDelete }) => {
    const IconComponent = iconMap[link.icon] || TargetIcon;
    return (
        <div className="bg-[#1C1C1C] rounded-lg p-5 flex flex-col justify-between shadow-lg transition-transform transform hover:-translate-y-1 relative">
            <div className="absolute top-3 right-3 flex items-center space-x-2">
                <button onClick={() => onToggleFavorite(link.id)} title={link.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
                    <StarIcon className={`w-5 h-5 transition-colors ${link.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500 hover:text-yellow-400'}`} />
                </button>
                <button onClick={() => onOpenModal(link)} title="Editar link">
                    <EditIcon className="w-5 h-5 text-gray-500 hover:text-white" />
                </button>
                <button onClick={() => onDelete(link.id)} title="Remover link">
                    <Trash2Icon className="w-5 h-5 text-gray-500 hover:text-red-500" />
                </button>
            </div>
            <div>
                <div className="bg-[#FF6B00]/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2" title={link.title}>{link.title}</h3>
                <p className="text-sm text-[#B3B3B3] mb-4 min-h-[40px]" title={link.description}>{link.description}</p>
            </div>
            <a href={link.link} target="_blank" rel="noopener noreferrer" className="mt-auto w-full bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors flex items-center justify-center text-sm">
                Abrir Link <ExternalLinkIcon className="w-4 h-4 ml-2" />
            </a>
        </div>
    );
};
const ContentCard: React.FC<{ item: ContentItem; isAdmin: boolean; onOpenModal: (item: ContentItem) => void; onDelete: (id: string) => void; onPreview: (item: ContentItem) => void }> = ({ item, isAdmin, onOpenModal, onDelete, onPreview }) => {
    const IconName = item.icon as keyof typeof LucideIcons;
    const Icon = (LucideIcons[IconName] || LucideIcons.Book) as React.FC<any>;
    const color = item.color || '#FF6B00';
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-[#1C1C1C] rounded-lg p-5 flex flex-col justify-between shadow-lg transition-transform transform hover:-translate-y-1 relative">
            {isAdmin && (
                <div className="absolute top-3 right-3 z-20">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 text-white hover:bg-black/50 rounded-full bg-black/30 backdrop-blur-sm transition-colors">
                        <LucideIcons.MoreVertical className="w-5 h-5" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 mt-1 w-32 bg-[#2E2E2E] rounded-md shadow-xl py-1 border border-[#3E3E3E]">
                            <button onClick={() => { setShowMenu(false); onOpenModal(item); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#3a3a3a] flex items-center">
                                <LucideIcons.Edit className="w-4 h-4 mr-2" /> Editar
                            </button>
                            <button onClick={() => { setShowMenu(false); onDelete(item.id); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#3a3a3a] flex items-center">
                                <LucideIcons.Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {item.cover_image && (
                <div className="w-full h-32 mb-4 rounded-lg overflow-hidden relative">
                    <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="absolute top-2 left-2 p-2 rounded-full bg-black/60" style={{ color }}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            )}
            
            {!item.cover_image && (
                <div className="p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4" style={{ backgroundColor: `${color}1A`, color }}>
                    <Icon className="w-6 h-6" />
                </div>
            )}
            
            <div>
                <h3 className="text-xl font-bold text-white mb-2" title={item.title}>{item.title}</h3>
                <p className="text-sm font-semibold mb-4" style={{ color }}>{item.category}</p>
            </div>
            
            <a href={item.file_url} target={item.category === 'Curso' ? '_self' : '_blank'} rel="noopener noreferrer" className="mt-auto w-full text-white force-text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm" style={{ backgroundColor: color, opacity: 0.9 }}>
                Acessar <ExternalLinkIcon className="w-4 h-4 ml-2" />
            </a>
        </div>
    );
};

const LinkModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: any) => void; editingLink: LinkItem | null; category: 'General' | 'Social' }> = ({ isOpen, onClose, onSave, editingLink, category }) => {
    const [formData, setFormData] = useState({
        title: editingLink?.title || '',
        description: editingLink?.description || '',
        link: editingLink?.link || '',
        icon: editingLink?.icon || (category === 'Social' ? 'Instagram' : 'Target'),
    });

    if (!isOpen) return null;

    const currentIconOptions = category === 'Social' ? socialIconOptions : generalIconOptions;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-lg p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white">
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold mb-4">{editingLink ? 'Editar Link' : 'Novo Link'}</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                    <input type="text" name="title" placeholder="Título" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="w-full p-2 bg-[#2E2E2E] rounded-md" required />
                    <textarea name="description" placeholder="Descrição" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full p-2 bg-[#2E2E2E] rounded-md" required />
                    <input type="url" name="link" placeholder="Link (https://...)" value={formData.link} onChange={e => setFormData(p => ({ ...p, link: e.target.value }))} className="w-full p-2 bg-[#2E2E2E] rounded-md" required />
                    <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Ícone</label>
                        <div className="grid grid-cols-7 gap-2 p-2 bg-[#0E0E0E] rounded-lg">
                            {currentIconOptions.map(iconName => {
                                const IconComponent = iconMap[iconName];
                                return (
                                    <button type="button" key={iconName} onClick={() => setFormData(p => ({ ...p, icon: iconName }))} className={`flex items-center justify-center p-3 rounded-md transition-all ${formData.icon === iconName ? 'bg-[#FF6B00]' : 'bg-[#2E2E2E] hover:bg-[#3a3a3a]'}`} title={iconName}>
                                        <IconComponent className="w-6 h-6" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 bg-[#2E2E2E] rounded-md hover:bg-[#3a3a3a]">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-[#FF6B00] rounded-md text-white font-semibold hover:bg-[#FF8C33]">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AccessModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (link: Omit<AccessLink, 'id'> & { id?: string }) => void; context: { mode: 'create' | 'edit', groupId: string, link?: AccessLink }; }> = ({ isOpen, onClose, onSave, context }) => {
    const isCreateMode = context.mode === 'create';
    const [formData, setFormData] = useState<Omit<AccessLink, 'id'> & { id?: string }>(
        !isCreateMode && context.link
            ? context.link
            : { nome: "", link: "", icon: 'LinkIcon', descricao: "", login: "", senha: "", isFavorite: false }
    );

    useEffect(() => {
        setFormData(
            !isCreateMode && context.link
                ? context.link
                : { nome: "", link: "", icon: 'LinkIcon', descricao: "", login: "", senha: "", isFavorite: false }
        );
    }, [context, isCreateMode]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white"><XIcon className="w-6 h-6" /></button>
                    <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">{isCreateMode ? 'Novo Acesso' : formData.nome}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isCreateMode && (
                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3]">Nome do Acesso</label>
                                <input type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md" required />
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Descrição</label>
                            <textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} rows={3} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3]">Login</label>
                                <input type="text" value={formData.login || ''} onChange={e => setFormData({ ...formData, login: e.target.value })} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3]">Senha</label>
                                <input type="password" value={formData.senha || ''} onChange={e => setFormData({ ...formData, senha: e.target.value })} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Link</label>
                            <input type="url" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://" className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md" required />
                        </div>
                        <div className="flex items-center justify-between">
                            {!isCreateMode && (
                                <a href={formData.link} target="_blank" rel="noopener noreferrer" className="text-sm text-[#FF6B00] hover:underline flex items-center gap-1">
                                    Acessar Link <ExternalLinkIcon className="w-4 h-4" />
                                </a>
                            )}
                            <div className="flex-grow"></div>
                            <button type="button" onClick={() => setFormData(p => ({ ...p, isFavorite: !p.isFavorite }))} className="flex items-center gap-2 text-sm text-yellow-400">
                                <StarIcon className={`w-5 h-5 transition-colors ${formData.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500 hover:text-yellow-400'}`} />
                                Favorito
                            </button>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 mr-2 bg-[#2E2E2E] rounded-md hover:bg-[#3a3a3a]">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-[#FF6B00] rounded-md text-white font-semibold hover:bg-[#FF8C33]">Salvar</button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const ContentModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (formData: FormData) => void; editingContent: ContentItem | null }> = ({ isOpen, onClose, onSave, editingContent }) => {
    const [title, setTitle] = useState(editingContent?.title || '');
    const [description, setDescription] = useState(editingContent?.description || '');
    const [category, setCategory] = useState<ContentCategory>(editingContent?.category || 'Curso');
    const [icon, setIcon] = useState(editingContent?.icon || 'Book');
    const [color, setColor] = useState(editingContent?.color || '#FF6B00');
    const [status, setStatus] = useState(editingContent ? editingContent.status : true);
    const [orderIndex, setOrderIndex] = useState(editingContent?.order_index?.toString() || '0');
    
    const [file, setFile] = useState<File | null>(null);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [removeCover, setRemoveCover] = useState(false);
    
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const categories: ContentCategory[] = ['Curso', 'Documento', 'E-book', 'Treinamento', 'Material da Focus', 'Código de Cultura'];
    const colors = ['#FF6B00', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
    const icons = ['Book', 'FileText', 'GraduationCap', 'Shield', 'Users', 'Briefcase', 'Video', 'Link', 'Archive', 'Award'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!editingContent && !file) {
            alert('Por favor, selecione um arquivo.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('icon', icon);
        formData.append('color', color);
        formData.append('status', status.toString());
        formData.append('order_index', orderIndex);
        if (file) formData.append('file', file);
        if (coverImage) formData.append('cover_image', coverImage);
        if (removeCover) formData.append('remove_cover', 'true');

        setIsUploading(true);
        // Simulate progress since XHR progress is tricky with standard fetch without custom wrapper, 
        // we'll just fake it or let the component loading state handle it.
        const interval = setInterval(() => {
            setUploadProgress(p => p >= 90 ? 90 : p + 10);
        }, 100);

        try {
            await onSave(formData);
        } finally {
            clearInterval(interval);
            setUploadProgress(100);
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
                <div className="p-6 border-b border-[#2E2E2E] flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-[#FF6B00]">{editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}</h2>
                    <button onClick={onClose} className="text-[#B3B3B3] hover:text-white"><LucideIcons.X className="w-6 h-6" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="contentForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Título *</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Guia Completo de Onboarding" className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md text-white" required />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Categoria *</label>
                            <select value={category} onChange={e => setCategory(e.target.value as ContentCategory)} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md text-white" required>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Descrição</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md text-white" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3] mb-1 block">Ícone</label>
                                <div className="flex flex-wrap gap-2">
                                    {icons.map(i => {
                                        const IconComp = LucideIcons[i as keyof typeof LucideIcons] as React.FC<any>;
                                        return (
                                            <button type="button" key={i} onClick={() => setIcon(i)} className={`p-2 rounded-md transition-colors ${icon === i ? 'bg-[#FF6B00] text-white' : 'bg-[#2E2E2E] text-[#B3B3B3] hover:bg-[#3a3a3a]'}`}>
                                                <IconComp className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3] mb-1 block">Cor do Card</label>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(c => (
                                        <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Arquivo do Conteúdo (PDF, DOCX, etc) {editingContent ? '(Deixe vazio para manter o atual)' : '*'}</label>
                            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md text-white text-sm" accept=".pdf,.doc,.docx,.ppt,.pptx" />
                            {file && <p className="text-xs mt-1 text-green-400">Arquivo selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Imagem de Capa (Opcional)</label>
                            <input type="file" onChange={e => { setCoverImage(e.target.files?.[0] || null); setRemoveCover(false); }} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md text-white text-sm" accept=".png,.jpg,.jpeg,.webp" />
                            {editingContent?.cover_image && !coverImage && !removeCover && (
                                <div className="flex items-center gap-2 mt-2">
                                    <img src={editingContent.cover_image} alt="Capa" className="h-10 rounded" />
                                    <button type="button" onClick={() => setRemoveCover(true)} className="text-xs text-red-400 hover:underline">Remover Capa Atual</button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3]">Ordem</label>
                                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md text-white" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <label className="text-sm font-medium text-[#B3B3B3] mb-2">Status</label>
                                <button type="button" onClick={() => setStatus(!status)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${status ? 'bg-[#FF6B00]' : 'bg-gray-600'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${status ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs mt-1">{status ? 'Ativo' : 'Inativo'}</span>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-[#2E2E2E] flex justify-end gap-2 bg-[#1a1a1a]">
                    <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 bg-[#2E2E2E] rounded-md hover:bg-[#3a3a3a] disabled:opacity-50">Cancelar</button>
                    <button type="submit" form="contentForm" disabled={isUploading} className="px-6 py-2 bg-[#FF6B00] rounded-md text-white font-semibold hover:bg-[#FF8C33] disabled:opacity-50 relative overflow-hidden">
                        {isUploading && (
                            <div className="absolute left-0 top-0 bottom-0 bg-white/20" style={{ width: `${uploadProgress}%`, transition: 'width 0.2s' }}></div>
                        )}
                        <span className="relative z-10">{isUploading ? 'Salvando...' : 'Salvar Conteúdo'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const PreviewModal: React.FC<{ content: ContentItem; onClose: () => void }> = ({ content, onClose }) => {
    const isImage = content.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isPDF = content.file_url.toLowerCase().endsWith('.pdf');

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
            <div className="flex justify-between items-center p-4 bg-[#1C1C1C] border-b border-[#2E2E2E]">
                <h3 className="text-xl font-bold text-white truncate max-w-[80%]">{content.title}</h3>
                <div className="flex items-center gap-4">
                    <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="text-[#B3B3B3] hover:text-white flex items-center gap-2" title="Abrir em nova aba / Baixar">
                        <ExternalLinkIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Baixar / Abrir</span>
                    </a>
                    <button onClick={onClose} className="text-[#B3B3B3] hover:text-white p-2 rounded-full hover:bg-[#2E2E2E] transition-colors">
                        <LucideIcons.X className="w-8 h-8" />
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
                {isImage && (
                    <img src={content.file_url} alt={content.title} className="max-w-full max-h-full object-contain" />
                )}
                {isPDF && (
                    <iframe 
                        src={`${content.file_url}#toolbar=0&navpanes=0&scrollbar=0`} 
                        className="w-full h-full border-none rounded bg-white"
                        title={content.title}
                    />
                )}
            </div>
        </div>
    );
};
const GroupModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: { name: string, color: string }) => void; editingGroup: AccessGroup | null }> = ({ isOpen, onClose, onSave, editingGroup }) => {
    const [name, setName] = useState(editingGroup?.name || '');
    const [color, setColor] = useState(editingGroup?.color || '#F97316');
    const colors = ['#F97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#6b7280'];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-sm p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white">
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold mb-4">{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSave({ name, color }); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Nome do Grupo</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-[#2E2E2E] rounded-md focus:outline-none focus:ring-1 focus:ring-[#FF6B00]" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Cor da Pasta</label>
                        <div className="flex gap-2 flex-wrap">
                            {colors.map(c => (
                                <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 bg-[#2E2E2E] rounded-md hover:bg-[#3a3a3a]">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-[#FF6B00] rounded-md text-white font-semibold hover:bg-[#FF8C33]">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FocusToolsScreen;