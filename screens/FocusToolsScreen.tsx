import React, { useState, useMemo, useEffect } from 'react';
import api from '../services/api';
import { LinkItem, ContentItem, ContentType, ContentCategory, AccessGroup, AccessLink, User, Role } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CameraIcon, CodeIcon, EditIcon, ExternalLinkIcon, FileTextIcon, GlobeIcon, NewspaperIcon,
    PlusIcon, SearchIcon, StarIcon, TargetIcon, Trash2Icon, UserIcon, XIcon, BookOpenIcon, AwardIcon, FileCodeIcon, SettingsIcon, LinkIcon, LockIcon, FolderIcon, FolderOpenIcon
} from '../components/icons';
import { useToast } from '../components/Toast';
import * as LucideIcons from 'lucide-react';

const MOCK_LINKS: LinkItem[] = [
    { id: 'tool-1', title: 'Focus Site', description: 'Acesso ao site institucional da Focus Marketing.', link: 'https://focusmarketing.com', icon: 'Globe', isFavorite: true },
    { id: 'tool-2', title: 'Focus Contrato', description: 'Plataforma de geração e assinatura de contratos.', link: '#', icon: 'FileText', isFavorite: false },
    { id: 'tool-3', title: 'Focus Estúdios', description: 'Setor audiovisual (produção de vídeo, social media).', link: '#', icon: 'Camera', isFavorite: true },
    { id: 'tool-4', title: 'Focus Tech', description: 'Desenvolvimento de sistemas e automações.', link: '#', icon: 'Code', isFavorite: false },
    { id: 'tool-5', title: 'Focus News', description: 'Portal de notícias e atualizações da empresa.', link: '#', icon: 'Newspaper', isFavorite: false },
    { id: 'tool-6', title: 'Painel Equipe', description: 'Links internos, dashboards e relatórios.', link: '#', icon: 'User', isFavorite: true },
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
            { id: 'acc-2', nome: "Instagram", link: "https://www.instagram.com", icon: 'LinkIcon', descricao: 'Conta principal da Focus Marketing.', login: '@focusmarketing', senha: 'securepassword123', isFavorite: false },
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
};
const iconOptions = Object.keys(iconMap);

const accessIconMap: { [key in AccessLink['icon']]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    LinkIcon: LinkIcon,
    GlobeIcon: GlobeIcon,
};


interface FocusToolsScreenProps {
    currentUser: User;
}

const FocusToolsScreen: React.FC<FocusToolsScreenProps> = ({ currentUser }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'integrations' | 'links' | 'content' | 'acessos'>('acessos');

    // State for Links Tab
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFavorites, setShowFavorites] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

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

    const handleAddNewGroup = async () => {
        const groupName = window.prompt("Digite o nome do novo grupo (pasta):");
        if (groupName && groupName.trim()) {
            try {
                const res = await api.post('/tools/access-groups', {
                    title: groupName.trim(),
                    category: 'General',
                    description: ''
                });

                const newGroup = res.data;
                // Map backend response to frontend AccessGroup type if needed (backend returns title, frontend uses name)
                const mappedGroup: AccessGroup = {
                    id: newGroup.id,
                    name: newGroup.title,
                    links: []
                };

                setAccessGroups(prev => [...prev, mappedGroup]);
                setOpenGroupId(mappedGroup.id);
            } catch (err) {
                console.error("Failed to create group:", err);
                // Fallback
                const newGroup: AccessGroup = {
                    id: `group-${Date.now()}`,
                    name: groupName.trim(),
                    links: []
                };
                setAccessGroups(prev => [...prev, newGroup]);
                setOpenGroupId(newGroup.id);
            }
        }
    };


    const filteredLinks = useMemo(() => {
        return links
            .filter(link => {
                const term = searchTerm.toLowerCase();
                const matchesSearch = link.title.toLowerCase().includes(term) || link.description.toLowerCase().includes(term);
                const matchesFavorite = showFavorites ? link.isFavorite : true;
                return matchesSearch && matchesFavorite;
            })
            .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    }, [links, searchTerm, showFavorites]);

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

    const handleOpenLinkModal = (link: LinkItem | null) => {
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
                    icon: linkData.icon
                });
                setLinks(prev => prev.map(l => l.id === editingLink.id ? res.data : l));
            } else {
                const res = await api.post('/tools/links', {
                    title: linkData.title,
                    description: linkData.description,
                    link: linkData.link,
                    category: 'General',
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

            <div className="flex items-center gap-2 border-b border-[#2E2E2E] mb-6">
                <button onClick={() => setActiveTab('links')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'links' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <LinkIcon className="w-5 h-5" /> Links Focus
                </button>
                <button onClick={() => setActiveTab('content')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'content' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <BookOpenIcon className="w-5 h-5" /> Conteúdo
                </button>
                <button onClick={() => setActiveTab('acessos')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'acessos' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <LockIcon className="w-5 h-5" /> Acessos
                </button>
                <button onClick={() => setActiveTab('integrations')} className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'integrations' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}>
                    <SettingsIcon className="w-5 h-5" /> Integrações
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
                {activeTab === 'acessos' && <AcessosTabContent accessGroups={accessGroups} openGroupId={openGroupId} setOpenGroupId={setOpenGroupId} onOpenModal={handleOpenAccessModal} onAddNewGroup={handleAddNewGroup} onDeleteGroup={handleDeleteAccessGroup} onDeleteLink={handleDeleteAccessLink} />}
                {activeTab === 'integrations' && <IntegrationsTabContent />}
            </div>
            {isLinkModalOpen && <LinkModal isOpen={isLinkModalOpen} onClose={handleCloseLinkModal} onSave={handleSaveLink} editingLink={editingLink} />}
            {isAccessModalOpen && accessModalContext && <AccessModal isOpen={isAccessModalOpen} onClose={handleCloseAccessModal} onSave={handleSaveAccessLink} context={accessModalContext} />}
            {isContentModalOpen && <ContentModal isOpen={isContentModalOpen} onClose={handleCloseContentModal} onSave={handleSaveContent} editingContent={editingContent} />}
            {previewContent && <PreviewModal content={previewContent} onClose={() => setPreviewContent(null)} />}
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

const AcessosTabContent: React.FC<any> = ({ accessGroups, openGroupId, setOpenGroupId, onOpenModal, onAddNewGroup, onDeleteGroup, onDeleteLink }) => (
    <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
            <button onClick={onAddNewGroup} className="flex items-center justify-center bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors text-sm">
                <PlusIcon className="w-4 h-4 mr-2" /> Criar Novo Grupo
            </button>
        </div>
        <div className="space-y-4">
            {accessGroups.map((group: AccessGroup) => (
                <div key={group.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg">
                    <button
                        onClick={() => setOpenGroupId(openGroupId === group.id ? null : group.id)}
                        className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-[#2a2a2a] transition-colors rounded-t-lg"
                    >
                        <div className="flex items-center gap-3">
                            {openGroupId === group.id ? <FolderOpenIcon className="w-5 h-5 text-[#FF6B00]" /> : <FolderIcon className="w-5 h-5 text-[#FF6B00]" />}
                            <span>{group.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-[#B3B3B3]">{group.links.length} links</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                                className="p-1 text-gray-500 hover:text-red-500 hover:bg-[#2E2E2E] rounded transition-colors"
                            >
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        </div>
                    </button>
                    <AnimatePresence>
                        {openGroupId === group.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 border-t border-[#2E2E2E] space-y-2">
                                    {group.links.map((link: AccessLink) => {
                                        const Icon = accessIconMap[link.icon];
                                        return (
                                            <button
                                                key={link.id}
                                                onClick={() => onOpenModal({ mode: 'edit', groupId: group.id, link: link })}
                                                className="w-full flex items-center gap-3 text-left p-3 bg-[#2E2E2E] hover:bg-[#3a3a3a] transition-colors rounded-lg group"
                                            >
                                                <Icon className="w-4 h-4 text-[#FF6B00] flex-shrink-0" />
                                                <span className="flex-grow truncate">{link.nome}</span>
                                                {link.isFavorite && <StarIcon className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteLink(link.id, group.id); }}
                                                    className="p-1 text-gray-500 hover:text-red-500 hover:bg-[#1C1C1C] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => onOpenModal({ mode: 'create', groupId: group.id })} className="w-full flex items-center justify-center gap-2 text-left p-3 bg-[#2E2E2E]/50 hover:bg-[#2E2E2E] transition-colors rounded-lg text-sm text-[#B3B3B3] border-2 border-dashed border-[#3a3a3a] hover:border-[#FF6B00]">
                                        <PlusIcon className="w-4 h-4" /> Adicionar Acesso
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    </div>
);


const IntegrationsTabContent: React.FC = () => {
    const toast = useToast();
    const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('focushub_discord_webhook') || '');
    const [selectedEvents, setSelectedEvents] = useState<string[]>(() => {
        const saved = localStorage.getItem('focushub_discord_events');
        return saved ? JSON.parse(saved) : ['task.created', 'task.completed'];
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    const events = [
        { id: 'task.created', label: '📋 Nova Tarefa', desc: 'Quando uma tarefa é criada' },
        { id: 'task.completed', label: '✅ Tarefa Concluída', desc: 'Quando uma tarefa é marcada como concluída' },
        { id: 'task.overdue', label: '⚠️ Tarefa Atrasada', desc: 'Quando uma tarefa passa do prazo' },
        { id: 'user.checkin', label: '👋 Check-in', desc: 'Quando alguém registra entrada' },
        { id: 'user.checkout', label: '🚪 Check-out', desc: 'Quando alguém registra saída' },
        { id: 'post.created', label: '📝 Nova Publicação', desc: 'Quando um post é criado no mural' },
    ];

    const handleSave = () => {
        localStorage.setItem('focushub_discord_webhook', webhookUrl);
        localStorage.setItem('focushub_discord_events', JSON.stringify(selectedEvents));
        setTestResult(null);
        toast.success('Configurações salvas!');
    };

    const handleToggleEvent = (eventId: string) => {
        setSelectedEvents(prev =>
            prev.includes(eventId)
                ? prev.filter(e => e !== eventId)
                : [...prev, eventId]
        );
    };

    const handleTest = async () => {
        if (!webhookUrl) return;
        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '🔔 Teste de Integração',
                        description: 'Webhook do Focus Hub configurado com sucesso!',
                        color: 0xFF6B00,
                        footer: { text: 'Focus Hub' },
                        timestamp: new Date().toISOString()
                    }]
                })
            });
            setTestResult(response.ok ? 'success' : 'error');
        } catch {
            setTestResult('error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    Discord
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-1">URL do Webhook</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={webhookUrl}
                                onChange={e => setWebhookUrl(e.target.value)}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="flex-grow p-2 bg-[#2E2E2E] rounded-md focus:ring-1 focus:ring-[#5865F2] border border-transparent focus:border-[#5865F2]"
                            />
                            <button
                                onClick={handleTest}
                                disabled={!webhookUrl || isTesting}
                                className="px-4 py-2 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isTesting ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : 'Testar'}
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-[#FF6B00] text-white rounded-md hover:bg-[#FF8C33] font-semibold"
                            >
                                Salvar
                            </button>
                        </div>
                        {testResult === 'success' && (
                            <p className="text-green-400 text-sm mt-2">✓ Webhook funcionando! Verifique seu canal no Discord.</p>
                        )}
                        {testResult === 'error' && (
                            <p className="text-red-400 text-sm mt-2">✗ Erro ao enviar. Verifique a URL do webhook.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Eventos para notificar</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {events.map(event => (
                                <label
                                    key={event.id}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedEvents.includes(event.id)
                                        ? 'bg-[#5865F2]/20 border border-[#5865F2]'
                                        : 'bg-[#2E2E2E] border border-transparent hover:border-[#5865F2]/50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.includes(event.id)}
                                        onChange={() => handleToggleEvent(event.id)}
                                        className="h-4 w-4 rounded bg-[#1C1C1C] border-gray-600 text-[#5865F2] focus:ring-[#5865F2] cursor-pointer"
                                    />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-white">{event.label}</p>
                                        <p className="text-xs text-[#B3B3B3]">{event.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#2E2E2E] p-4 rounded-lg text-sm text-[#B3B3B3]">
                        <p className="font-semibold text-white mb-2">💡 Como criar um webhook no Discord:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Abra as Configurações do Servidor no Discord</li>
                            <li>Acesse Integrações → Webhooks</li>
                            <li>Clique em "Novo Webhook"</li>
                            <li>Escolha o canal e copie a URL</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* WhatsApp Integration Section */}
            <WhatsAppIntegrationSection />

            {/* Google Sheets Section */}
            <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md mt-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-[#34A853]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                        <path d="M7 7h4v2H7zm0 4h4v2H7zm0 4h4v2H7zm6-8h4v2h-4zm0 4h4v2h-4zm0 4h4v2h-4z" />
                    </svg>
                    Google Sheets
                </h2>

                <div className="space-y-4">
                    <div className="bg-[#2E2E2E] p-4 rounded-lg">
                        <p className="text-white font-medium mb-2">📊 Exportação disponível em:</p>
                        <ul className="list-disc list-inside text-[#B3B3B3] space-y-1">
                            <li><strong>Tarefas</strong> - Quadro de tarefas (ícone verde no header)</li>
                            <li><strong>Registro de Ponto</strong> - Tabela de check-ins</li>
                        </ul>
                    </div>

                    <div className="bg-[#0E0E0E] p-4 rounded-lg text-sm text-[#B3B3B3]">
                        <p className="font-semibold text-white mb-2">💡 Como usar:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Clique no ícone do Sheets na tela desejada</li>
                            <li>Os dados serão copiados para sua área de transferência</li>
                            <li>Uma nova planilha abrirá no Google Sheets</li>
                            <li>Cole os dados com <kbd className="bg-[#2E2E2E] px-2 py-1 rounded">Ctrl+V</kbd></li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Google Calendar OAuth Section */}
            <GoogleCalendarSection />
        </div>
    );
};

const GoogleCalendarSection: React.FC = () => {
    const toast = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkGoogleStatus();
        // Check for OAuth callback
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_connected') === 'true') {
            toast.success('Google Calendar conectado com sucesso!');
            window.history.replaceState({}, '', window.location.pathname);
            setIsConnected(true);
            setIsConfigured(true);
        }
        if (params.get('google_error')) {
            toast.error('Erro ao conectar Google Calendar');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkGoogleStatus = async () => {
        try {
            const { data } = await api.get('/google/status');
            setIsConnected(data.connected);
            setIsConfigured(data.configured);
        } catch (error) {
            console.error('Error checking Google status:', error);
            // If connection fails, keep isConfigured as false (default)
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const { data } = await api.get('/google/auth-url');

            if (data.error) {
                toast.error(data.message || 'Google Calendar não configurado');
                return;
            }

            window.location.href = data.authUrl;
        } catch (error) {
            toast.error('Erro ao conectar com Google');
        }
    };

    const handleDisconnect = async () => {
        try {
            await api.delete('/google/disconnect');
            setIsConnected(false);
            toast.success('Desconectado do Google Calendar');
        } catch (error) {
            toast.error('Erro ao desconectar');
        }
    };

    return (
        <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                </svg>
                Google Calendar
            </h2>

            {isLoading ? (
                <div className="text-[#B3B3B3]">Verificando conexão...</div>
            ) : !isConfigured ? (
                <div className="bg-[#2E2E2E] p-4 rounded-lg">
                    <p className="text-yellow-400 font-medium mb-2">⚠️ Configuração Pendente</p>
                    <p className="text-[#B3B3B3] text-sm">
                        O administrador precisa configurar as credenciais do Google Cloud Console para habilitar esta integração.
                        Verifique também se a variável VITE_API_URL está correta no Vercel.
                    </p>
                </div>
            ) : isConnected ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Conectado ao Google Calendar</span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Desconectar
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-[#B3B3B3]">
                        Conecte sua conta Google para sincronizar tarefas automaticamente com seu calendário.
                    </p>
                    <button
                        onClick={handleConnect}
                        className="flex items-center gap-2 px-4 py-2 bg-[#4285F4] text-white rounded-lg hover:bg-[#3367D6] transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                        Conectar Google Calendar
                    </button>
                </div>
            )}
        </div>
    );
};

const WhatsAppIntegrationSection: React.FC = () => {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('LOADING');
    const [loading, setLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [stats, setStats] = useState<{ sentToday: number; sentThisWeek: number; connectedUsers: number } | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data.status);
            if (res.data.status === 'WAITING_FOR_SCAN' || res.data.status === 'DISCONNECTED') {
                fetchQr();
            }
        } catch (error) {
            console.error('Failed to fetch status', error);
            setStatus('ERROR');
        }
    };

    const fetchQr = async () => {
        try {
            const res = await api.get('/whatsapp/qr');
            if (res.data.qr) {
                setQrCode(res.data.qr);
            }
        } catch (error) {
            console.error('Failed to fetch QR', error);
        }
    };

    useEffect(() => {
        // Poll status every 5 seconds only if component is mounted
        fetchStatus();
        fetchStats();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/whatsapp/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone) return alert('Digite um número');
        setLoading(true);
        try {
            await api.post('/whatsapp/send', {
                to: testPhone,
                message: '🔔 Teste de Integração Focus Hub: Seu WhatsApp está conectado com sucesso!'
            });
            alert('Mensagem enviada com sucesso!');
        } catch (error) {
            alert('Falha ao enviar mensagem');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md mt-6 border border-[#2E2E2E]">
            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <svg className="w-6 h-6 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp Bot
            </h2>

            <div className="bg-[#2E2E2E] p-4 rounded-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <p className="text-white font-medium mb-1">Status da Conexão</p>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${status === 'CONNECTED' ? 'bg-green-500/20 text-green-500' :
                            status === 'WAITING_FOR_SCAN' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-red-500/20 text-red-500'
                            }`}>
                            {status === 'CONNECTED' ? '● CONECTADO' :
                                status === 'WAITING_FOR_SCAN' ? '● AGUARDANDO LEITURA DO QR' :
                                    `● DESCONECTADO (${status})`}
                        </div>
                        <p className="text-sm text-[#B3B3B3] mt-2">
                            {status === 'CONNECTED'
                                ? 'O bot do sistema está ativo e pronto para enviar notificações.'
                                : 'Escaneie o QR Code para conectar o WhatsApp do sistema.'}
                        </p>
                        {stats?.error && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                                <strong>Erro:</strong> {stats.error}
                            </div>
                        )}
                    </div>

                    {status !== 'CONNECTED' && (
                        <div className="flex flex-col items-center mt-6">
                            {qrCode ? (
                                <div className="bg-white p-2 rounded-lg">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-32 h-32 md:w-40 md:h-40 object-contain" />
                                </div>
                            ) : (
                                <div className="w-32 h-32 flex items-center justify-center bg-[#1C1C1C] rounded-lg border border-[#3E3E3E]">
                                    <span className="text-xs text-[#B3B3B3]">Carregando QR...</span>
                                </div>
                            )}
                            <p className="text-xs text-[#B3B3B3] mt-2 text-center">Abra o WhatsApp &gt; Aparelhos Conectados</p>
                        </div>
                    )}
                </div>

                {status === 'CONNECTED' && (
                    <div className="mt-6 pt-4 border-t border-[#3E3E3E]">
                        <h3 className="text-sm font-semibold text-white mb-2">Testar Envio</h3>
                        <div className="flex gap-2 max-w-md">
                            <input
                                type="text"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                placeholder="5511999999999"
                                className="flex-1 bg-[#1C1C1C] border border-[#3E3E3E] rounded-lg text-white px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500"
                            />
                            <button
                                onClick={handleSendTest}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {loading ? '...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            {
                status === 'CONNECTED' && stats && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-[#2E2E2E] p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-500">{stats.sentToday}</p>
                            <p className="text-xs text-[#B3B3B3]">Enviadas Hoje</p>
                        </div>
                        <div className="bg-[#2E2E2E] p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-blue-500">{stats.sentThisWeek}</p>
                            <p className="text-xs text-[#B3B3B3]">Esta Semana</p>
                        </div>
                        <div className="bg-[#2E2E2E] p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-orange-500">{stats.connectedUsers}</p>
                            <p className="text-xs text-[#B3B3B3]">Usuários Conectados</p>
                        </div>
                    </div>
                )
            }

            {/* Commands Reference */}
            <div className="bg-[#0E0E0E] p-4 rounded-lg mt-4">
                <p className="font-semibold text-white mb-2">🤖 Comandos do Chatbot</p>
                <p className="text-xs text-[#B3B3B3] mb-2">Os usuários podem enviar estes comandos para o número do bot:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <code className="bg-[#2E2E2E] px-2 py-1 rounded text-green-400">!tarefas</code>
                    <span className="text-[#B3B3B3]">Lista tarefas pendentes</span>
                    <code className="bg-[#2E2E2E] px-2 py-1 rounded text-green-400">!hoje</code>
                    <span className="text-[#B3B3B3]">Tarefas do dia</span>
                    <code className="bg-[#2E2E2E] px-2 py-1 rounded text-green-400">!concluir ID</code>
                    <span className="text-[#B3B3B3]">Marca tarefa como concluída</span>
                    <code className="bg-[#2E2E2E] px-2 py-1 rounded text-green-400">!entrada</code>
                    <span className="text-[#B3B3B3]">Registra check-in</span>
                    <code className="bg-[#2E2E2E] px-2 py-1 rounded text-green-400">!saida</code>
                    <span className="text-[#B3B3B3]">Registra check-out</span>
                    <code className="bg-[#2E2E2E] px-2 py-1 rounded text-green-400">!status</code>
                    <span className="text-[#B3B3B3]">Resumo do dia</span>
                </div>
            </div>
        </div >
    );
};


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
                <div className="absolute top-3 right-3">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-500 hover:text-white">
                        <LucideIcons.MoreVertical className="w-5 h-5" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-32 bg-[#2E2E2E] rounded-md shadow-lg z-10 py-1">
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
            
            <a href={item.file_url} target={item.category === 'Curso' ? '_self' : '_blank'} rel="noopener noreferrer" className="mt-auto w-full text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm" style={{ backgroundColor: color, opacity: 0.9 }}>
                Acessar <ExternalLinkIcon className="w-4 h-4 ml-2" />
            </a>
        </div>
    );
};

const LinkModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: any) => void; editingLink: LinkItem | null }> = ({ isOpen, onClose, onSave, editingLink }) => {
    const [formData, setFormData] = useState({
        title: editingLink?.title || '',
        description: editingLink?.description || '',
        link: editingLink?.link || '',
        icon: editingLink?.icon || 'Target',
    });

    if (!isOpen) return null;

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
                            {iconOptions.map(iconName => {
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

export default FocusToolsScreen;