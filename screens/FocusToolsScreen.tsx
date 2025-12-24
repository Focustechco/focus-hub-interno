import React, { useState, useMemo, useEffect } from 'react';
import api from '../services/api';
import { LinkItem, ContentItem, ContentType, ContentCategory, AccessGroup, AccessLink, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CameraIcon, CodeIcon, EditIcon, ExternalLinkIcon, FileTextIcon, GlobeIcon, NewspaperIcon,
    PlusIcon, SearchIcon, StarIcon, TargetIcon, Trash2Icon, UserIcon, XIcon, BookOpenIcon, AwardIcon, FileCodeIcon, SettingsIcon, LinkIcon, LockIcon, FolderIcon, FolderOpenIcon
} from '../components/icons';

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
    const [activeTab, setActiveTab] = useState<'integrations' | 'links' | 'content' | 'acessos'>('acessos');

    // State for Links Tab
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFavorites, setShowFavorites] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

    // State for Content Tab
    const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');

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
            alert("Erro ao salvar acesso.");
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
            alert("Erro ao remover acesso.");
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
            alert("Erro ao remover grupo.");
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
        if (selectedCategory === 'all') return MOCK_CONTENT;
        return MOCK_CONTENT.filter(item => item.category === selectedCategory);
    }, [selectedCategory]);

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
                    url: linkData.link,
                    category: 'General',
                    icon: linkData.icon,
                    userId: currentUser.id // Add userId
                });

                setLinks(prev => [res.data, ...prev]);
            }
        } catch (err) {
            console.error("Failed to save link:", err);
            alert("Erro ao salvar link.");
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
                {activeTab === 'content' && <ContentTabContent content={filteredContent} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} categoryConfig={contentCategoryConfig} iconMap={contentIconMap} />}
                {activeTab === 'acessos' && <AcessosTabContent accessGroups={accessGroups} openGroupId={openGroupId} setOpenGroupId={setOpenGroupId} onOpenModal={handleOpenAccessModal} onAddNewGroup={handleAddNewGroup} onDeleteGroup={handleDeleteAccessGroup} onDeleteLink={handleDeleteAccessLink} />}
                {activeTab === 'integrations' && <IntegrationsTabContent />}
            </div>
            {isLinkModalOpen && <LinkModal isOpen={isLinkModalOpen} onClose={handleCloseLinkModal} onSave={handleSaveLink} editingLink={editingLink} />}
            {isAccessModalOpen && accessModalContext && <AccessModal isOpen={isAccessModalOpen} onClose={handleCloseAccessModal} onSave={handleSaveAccessLink} context={accessModalContext} />}
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

const ContentTabContent: React.FC<any> = ({ content, selectedCategory, setSelectedCategory, categoryConfig, iconMap }) => (
    <div>
        <div className="mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
                <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[#FF6B00] text-white' : 'bg-[#1C1C1C] text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}>Todos</button>
                {categoryConfig.map(({ name, icon: Icon }: any) => (
                    <button key={name} onClick={() => setSelectedCategory(name)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${selectedCategory === name ? 'bg-[#FF6B00] text-white' : 'bg-[#1C1C1C] text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}>
                        <Icon className="w-4 h-4" /> {name}
                    </button>
                ))}
            </div>
        </div>
        {content.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {content.map((item: ContentItem) => <ContentCard key={item.id} item={item} iconMap={iconMap} />)}
            </div>
        ) : (
            <div className="text-center text-[#B3B3B3] py-16"><p>Nenhum conteúdo encontrado nesta categoria.</p></div>
        )}
    </div>
);

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


const IntegrationsTabContent: React.FC = () => (
    <div className="text-center text-[#B3B3B3] py-16">
        <h2 className="text-xl font-bold mb-2">Em Breve</h2>
        <p>A área de integrações está em desenvolvimento para conectar suas ferramentas favoritas.</p>
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
const ContentCard: React.FC<{ item: ContentItem; iconMap: any }> = ({ item, iconMap }) => {
    const Icon = iconMap[item.type];
    return (
        <div className="bg-[#1C1C1C] rounded-lg p-5 flex flex-col justify-between shadow-lg transition-transform transform hover:-translate-y-1">
            <div>
                <div className="bg-[#FF6B00]/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2" title={item.title}>{item.title}</h3>
                <p className="text-sm font-semibold text-[#FF6B00] mb-4">{item.type}</p>
            </div>
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="mt-auto w-full bg-[#FF6B00] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors flex items-center justify-center text-sm">
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

export default FocusToolsScreen;