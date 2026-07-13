import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  Users,
  Clock,
  Star,
  Trash2,
  Settings,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  X,
  ExternalLink,
  Download,
  Plus,
  Loader2,
  FolderOpen,
  FileText,
  Sheet,
  Presentation,
  FileImage,
  File,
  ArrowLeft,
  Check,
  Menu,
  FilePlus2,
  Cloud,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import type { User, Role } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveScreenProps {
  currentUser: User;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  owners?: { displayName: string; photoLink?: string }[];
  starred?: boolean;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

interface DriveFolderPermission {
  id: number;
  folder_id: string;
  folder_name: string;
  sector: string;
}

interface StorageInfo {
  usage: number;
  limit: number;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

type SidebarTab =
  | 'my-drive'
  | 'shared'
  | 'recent'
  | 'starred'
  | 'trash';

type ViewMode = 'grid' | 'list';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTORS = ['Administração', 'Tech', 'RH', 'Comercial', 'Financeiro'] as const;

const MIME_TYPES = {
  folder: 'application/vnd.google-apps.folder',
  document: 'application/vnd.google-apps.document',
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
  presentation: 'application/vnd.google-apps.presentation',
  pdf: 'application/pdf',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(mimeType: string) {
  if (mimeType === MIME_TYPES.folder) return { Icon: FolderOpen, color: '#FBBF24' };
  if (mimeType === MIME_TYPES.document) return { Icon: FileText, color: '#4285F4' };
  if (mimeType === MIME_TYPES.spreadsheet) return { Icon: Sheet, color: '#34A853' };
  if (mimeType === MIME_TYPES.presentation) return { Icon: Presentation, color: '#FBBC04' };
  if (mimeType === MIME_TYPES.pdf) return { Icon: FileText, color: '#EA4335' };
  if (mimeType.startsWith('image/')) return { Icon: FileImage, color: '#A855F7' };
  return { Icon: File, color: '#9CA3AF' };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Animation variants ──────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const slideRight = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.25 } },
};

const scaleFade = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/* ---------- Google Drive Logo SVG ---------- */
function GoogleDriveLogo({ size = 64 }: { size?: number }) {
  return <Cloud size={size} color="#FF6B00" fill="#FF6B00" />;
}

/* ---------- Skeleton loader ---------- */
function SkeletonCard() {
  return (
    <div className="bg-[#1C1C1C] rounded-xl p-4 animate-pulse">
      <div className="w-10 h-10 bg-[#2E2E2E] rounded-lg mb-3" />
      <div className="h-4 bg-[#2E2E2E] rounded w-3/4 mb-2" />
      <div className="h-3 bg-[#2E2E2E] rounded w-1/2" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 bg-[#2E2E2E] rounded-lg shrink-0" />
      <div className="h-4 bg-[#2E2E2E] rounded flex-1 max-w-[200px]" />
      <div className="h-3 bg-[#2E2E2E] rounded w-24 hidden md:block" />
      <div className="h-3 bg-[#2E2E2E] rounded w-28 hidden md:block" />
      <div className="h-3 bg-[#2E2E2E] rounded w-16 hidden md:block" />
    </div>
  );
}

// ── Blob Previewer Component (PDFs & Images) ──────────────────────────────────
const BlobPreviewer = ({ fileId, mimeType, fileName }: { fileId: string; mimeType: string; fileName: string }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchFile = async () => {
      try {
        const res = await api.get(`/drive/files/${fileId}/download`, { responseType: 'blob' });
        if (!active) return;
        const url = URL.createObjectURL(res.data);
        setBlobUrl(url);
      } catch (err) {
        if (!active) return;
        console.error("Erro ao carregar arquivo", err);
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFile();
    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-[#B3B3B3]">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        <p>Carregando arquivo...</p>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-red-400">
        <FileText size={48} className="text-[#B3B3B3]" />
        <p>Erro ao carregar o arquivo.</p>
      </div>
    );
  }

  if (mimeType.startsWith('image/')) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <img
          src={blobUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden flex items-center justify-center">
      <object data={`${blobUrl}#toolbar=0&navpanes=0&view=FitH`} type="application/pdf" width="100%" height="100%">
        <p className="p-4 text-center text-gray-500">Seu navegador não suporta a visualização embutida de PDFs.</p>
      </object>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function DriveScreen({ currentUser }: DriveScreenProps) {
  const { showToast } = useToast();
  const isAdmin = currentUser.role === ('ADMIN' as unknown as typeof currentUser.role);

  // Connection state
  const [connected, setConnected] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<SidebarTab>('my-drive');
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Meu Drive' }]);
  const [currentFolderId, setCurrentFolderId] = useState('root');

  // Files
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);

  // Preview
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  // Storage
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  // Admin Permissions Config
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState<DriveFolderPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [rootFolders, setRootFolders] = useState<DriveFile[]>([]);
  const [folderPickerSector, setFolderPickerSector] = useState<string | null>(null);
  const [folderPickerLoading, setFolderPickerLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Check connection status ────────────────────────────────────────────────

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const res = await api.get('/google/status');
      setConnected(res.data.connected);
      setConfigured(res.data.configured);
    } catch {
      setConnected(false);
    }
  }

  async function handleConnect() {
    setConnectLoading(true);
    try {
      const res = await api.get('/google/auth-url');
      window.open(res.data.authUrl, '_blank', 'noopener,noreferrer');
      showToast('Conclua a autenticação na janela aberta', 'info');
    } catch {
      showToast('Erro ao obter URL de autenticação', 'error');
    } finally {
      setConnectLoading(false);
    }
  }

  // ── Fetch files ────────────────────────────────────────────────────────────

  const fetchFiles = useCallback(
    async (folderId: string, pageToken?: string) => {
      if (pageToken) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await api.get('/drive/files', {
          params: { folderId, pageToken: pageToken || '', pageSize: 30 },
        });
        if (pageToken) {
          setFiles((prev) => [...prev, ...res.data.files]);
        } else {
          setFiles(res.data.files);
        }
        setNextPageToken(res.data.nextPageToken || null);
      } catch {
        showToast('Erro ao carregar arquivos', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showToast]
  );

  const fetchSpecialTab = useCallback(
    async (tab: SidebarTab) => {
      setLoading(true);
      try {
        const endpoint =
          tab === 'shared'
            ? '/drive/shared'
            : tab === 'recent'
            ? '/drive/recent'
            : tab === 'starred'
            ? '/drive/starred'
            : '/drive/trash';
        const res = await api.get(endpoint);
        setFiles(res.data.files);
        setNextPageToken(null);
      } catch {
        showToast('Erro ao carregar arquivos', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  // When connected, load initial data
  useEffect(() => {
    if (connected) {
      fetchFiles('root');
      api
        .get('/drive/storage')
        .then((res) => setStorage(res.data))
        .catch(() => {});
    }
  }, [connected, fetchFiles]);

  // ── Upload files ───────────────────────────────────────────────────────────

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // If we are inside a folder, append folderId
      if (currentFolderId && currentFolderId !== 'root') {
        formData.append('folderId', currentFolderId);
      }

      await api.post('/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Arquivo enviado com sucesso', 'success');
      // Refresh current folder
      fetchFiles(currentFolderId);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Erro ao fazer upload do arquivo', 'error');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Tab changes
  useEffect(() => {
    if (!connected) return;
    setSearchQuery('');
    setShowPermissions(false);
    if (activeTab === 'my-drive') {
      setCurrentFolderId('root');
      setBreadcrumb([{ id: 'root', name: 'Meu Drive' }]);
      fetchFiles('root');
    } else {
      setBreadcrumb([]);
      fetchSpecialTab(activeTab);
    }
  }, [activeTab, connected, fetchFiles, fetchSpecialTab]);

  // Search
  useEffect(() => {
    if (!connected) return;
    if (!debouncedSearch.trim()) {
      if (isSearching) {
        setIsSearching(false);
        if (activeTab === 'my-drive') {
          fetchFiles(currentFolderId);
        } else {
          fetchSpecialTab(activeTab);
        }
      }
      return;
    }
    setIsSearching(true);
    setLoading(true);
    api
      .get('/drive/search', { params: { q: debouncedSearch } })
      .then((res) => {
        setFiles(res.data.files);
        setNextPageToken(null);
      })
      .catch(() => showToast('Erro na pesquisa', 'error'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, connected]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigateToFolder(file: DriveFile) {
    const newCrumb: BreadcrumbItem = { id: file.id, name: file.name };
    setBreadcrumb((prev) => [...prev, newCrumb]);
    setCurrentFolderId(file.id);
    fetchFiles(file.id);
  }

  function navigateToBreadcrumb(index: number) {
    const target = breadcrumb[index];
    setBreadcrumb((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
    fetchFiles(target.id);
  }

  function handleFileClick(file: DriveFile) {
    if (file.mimeType === MIME_TYPES.folder) {
      navigateToFolder(file);
    } else {
      setPreviewFile(file);
    }
  }

  // ── Admin Permissions ──────────────────────────────────────────────────────

  async function loadPermissions() {
    setPermissionsLoading(true);
    try {
      const res = await api.get('/drive/permissions');
      setPermissions(res.data);
    } catch {
      showToast('Erro ao carregar permissões', 'error');
    } finally {
      setPermissionsLoading(false);
    }
  }

  async function deletePermission(id: number) {
    try {
      await api.delete(`/drive/permissions/${id}`);
      setPermissions((prev) => prev.filter((p) => p.id !== id));
      showToast('Permissão removida', 'success');
    } catch {
      showToast('Erro ao remover permissão', 'error');
    }
  }

  async function openFolderPicker(sector: string) {
    setFolderPickerSector(sector);
    setFolderPickerLoading(true);
    try {
      const res = await api.get('/drive/root-folders');
      setRootFolders(res.data.files);
    } catch {
      showToast('Erro ao carregar pastas', 'error');
    } finally {
      setFolderPickerLoading(false);
    }
  }

  async function assignFolder(folder: DriveFile) {
    if (!folderPickerSector) return;
    try {
      await api.post('/drive/permissions', {
        folderId: folder.id,
        folderName: folder.name,
        sector: folderPickerSector,
      });
      showToast(`Pasta "${folder.name}" atribuída a ${folderPickerSector}`, 'success');
      setFolderPickerSector(null);
      loadPermissions();
    } catch {
      showToast('Erro ao atribuir pasta', 'error');
    }
  }

  function handleOpenPermissions() {
    setShowPermissions(true);
    loadPermissions();
  }

  // ── Preview helpers ────────────────────────────────────────────────────────

  function getPreviewContent(file: DriveFile) {
    const { mimeType, webViewLink, thumbnailLink } = file;

    // Use built-in Blob Previewer for images, PDFs, and Google Docs (which are exported as PDFs)
    if (
      mimeType === MIME_TYPES.pdf ||
      mimeType.startsWith('image/') ||
      mimeType === MIME_TYPES.document ||
      mimeType === MIME_TYPES.spreadsheet ||
      mimeType === MIME_TYPES.presentation
    ) {
      return <BlobPreviewer fileId={file.id} mimeType={mimeType} fileName={file.name} />;
    }

    // Fallback
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <File size={64} className="text-[#B3B3B3]" />
        <p className="text-[#B3B3B3] text-sm">Pré-visualização não disponível para este tipo de arquivo.</p>
        {webViewLink && (
          <a
            href={webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E25E00] text-white rounded-lg font-medium transition-colors"
          >
            <ExternalLink size={16} />
            Abrir no Google Drive
          </a>
        )}
      </div>
    );
  }

  // ── Grouped permissions by sector ──────────────────────────────────────────

  const permissionsBySector = useMemo(() => {
    const map: Record<string, DriveFolderPermission[]> = {};
    SECTORS.forEach((s) => (map[s] = []));
    permissions.forEach((p) => {
      if (!map[p.sector]) map[p.sector] = [];
      map[p.sector].push(p);
    });
    return map;
  }, [permissions]);

  // ── Storage percent ────────────────────────────────────────────────────────

  const storagePercent = storage ? Math.min((storage.usage / storage.limit) * 100, 100) : 0;

  // ── Render: Not connected ──────────────────────────────────────────────────

  if (connected === null) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0E0E0E]">
        <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0E0E0E] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] p-10 max-w-md w-full text-center shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-[#2E2E2E]/60 rounded-2xl">
              <GoogleDriveLogo size={56} />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Google Drive</h2>
          <p className="text-[#B3B3B3] text-sm leading-relaxed mb-8">
            Conecte sua conta do Google para acessar, pesquisar e gerenciar seus arquivos do Drive
            diretamente pelo Focus Hub.
          </p>
          <button
            onClick={handleConnect}
            disabled={connectLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#FF6B00] hover:bg-[#E25E00] disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-[#FF6B00]/20 hover:shadow-[#FF6B00]/30"
          >
            {connectLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <GoogleDriveLogo size={20} />
            )}
            {connectLoading ? 'Redirecionando…' : 'Conectar com Google'}
          </button>
          {!configured && (
            <p className="text-[#B3B3B3]/60 text-xs mt-4">
              A integração precisa ser configurada pelo administrador primeiro.
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Render: Connected ──────────────────────────────────────────────────────

  const sidebarItems: {
    key: SidebarTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }[] = [
    { key: 'my-drive', label: 'Meu Drive', icon: <HardDrive size={18} /> },
    { key: 'shared', label: 'Compartilhados comigo', icon: <Users size={18} /> },
    { key: 'recent', label: 'Recentes', icon: <Clock size={18} /> },
    { key: 'starred', label: 'Favoritos', icon: <Star size={18} /> },
    { key: 'trash', label: 'Lixeira', icon: <Trash2 size={18} />, adminOnly: true },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0E0E0E] overflow-hidden relative">
      {/* ── Top Navigation Bar ── */}
      <header className="flex-none bg-[#1C1C1C] border-b border-[#2E2E2E] flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <GoogleDriveLogo size={24} />
            <span className="text-white font-semibold text-sm hidden sm:inline">Google Drive</span>
          </div>

            <nav className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
              {sidebarItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const active = activeTab === item.key && !showPermissions;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key);
                        setShowPermissions(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap
                        ${
                          active
                            ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                            : 'text-[#B3B3B3] hover:bg-[#2E2E2E] hover:text-white'
                        }`}
                    >
                      {item.icon}
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  );
                })}

              {isAdmin && (
                <>
                  <div className="w-px h-4 bg-[#2E2E2E] mx-2 shrink-0" />
                  <button
                    onClick={() => {
                      handleOpenPermissions();
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap
                      ${
                        showPermissions
                          ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                          : 'text-[#B3B3B3] hover:bg-[#2E2E2E] hover:text-white'
                      }`}
                  >
                    <Settings size={18} />
                    <span className="hidden md:inline">Configurar Acesso</span>
                  </button>
                </>
              )}
            </nav>
          </div>

        {/* Storage indicator */}
        {storage && (
          <div className="hidden sm:flex flex-col items-end shrink-0 ml-4">
            <div className="flex items-center gap-2 text-[10px] text-[#B3B3B3] mb-1">
              <span>{formatBytes(storage.usage)} de {formatBytes(storage.limit)}</span>
            </div>
            <div className="w-24 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercent > 90
                    ? 'bg-red-500'
                    : storagePercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-[#FF6B00]'
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {showPermissions && isAdmin ? (
          /* ── Admin Permissions Panel ── */
          <motion.div
            key="permissions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setShowPermissions(false)}
                  className="p-2 rounded-lg bg-[#2E2E2E] hover:bg-[#3E3E3E] text-white transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-xl font-semibold text-white">Configurar Acesso por Setor</h2>
              </div>
              <p className="text-[#B3B3B3] text-sm mb-8">
                Defina quais pastas do Google Drive cada setor pode acessar. Somente administradores
                podem alterar essas configurações.
              </p>

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-[#FF6B00]" />
                </div>
              ) : (
                <div className="space-y-4">
                  {SECTORS.map((sector) => {
                    const sectorPerms = permissionsBySector[sector] || [];
                    return (
                      <motion.div
                        key={sector}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-medium text-sm">{sector}</h3>
                          <button
                            onClick={() => openFolderPicker(sector)}
                            className="flex items-center gap-1.5 text-xs text-[#FF6B00] hover:text-[#E25E00] font-medium transition-colors"
                          >
                            <Plus size={14} />
                            Adicionar Pasta
                          </button>
                        </div>

                        {sectorPerms.length === 0 ? (
                          <p className="text-xs text-[#B3B3B3]/50">Nenhuma pasta atribuída</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {sectorPerms.map((perm) => (
                              <span
                                key={perm.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#2E2E2E] rounded-lg text-xs text-white"
                              >
                                <FolderOpen size={13} className="text-[#FBBF24]" />
                                {perm.folder_name}
                                <button
                                  onClick={() => deletePermission(perm.id)}
                                  className="p-0.5 rounded hover:bg-[#3E3E3E] text-[#B3B3B3] hover:text-red-400 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Inline folder picker */}
                        <AnimatePresence>
                          {folderPickerSector === sector && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 border-t border-[#2E2E2E] pt-4 overflow-hidden"
                            >
                              {folderPickerLoading ? (
                                <div className="flex items-center gap-2 text-[#B3B3B3] text-xs py-2">
                                  <Loader2 size={14} className="animate-spin" />
                                  Carregando pastas…
                                </div>
                              ) : (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-[#B3B3B3]">Selecione uma pasta:</span>
                                    <button
                                      onClick={() => setFolderPickerSector(null)}
                                      className="text-[#B3B3B3] hover:text-white"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  {rootFolders.map((folder) => (
                                    <button
                                      key={folder.id}
                                      onClick={() => assignFolder(folder)}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2E2E2E] text-sm text-white transition-colors text-left"
                                    >
                                      <FolderOpen size={16} className="text-[#FBBF24] shrink-0" />
                                      {folder.name}
                                    </button>
                                  ))}
                                  {rootFolders.length === 0 && (
                                    <p className="text-xs text-[#B3B3B3]/50 py-2">
                                      Nenhuma pasta encontrada na raiz.
                                    </p>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── File Browser ── */
          <>
            {/* Toolbar */}
            <div className="px-6 pt-5 pb-3 flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar arquivos…"
                  className="w-full pl-9 pr-9 py-2.5 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl text-sm text-white placeholder:text-[#B3B3B3]/50 focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>

              {/* Upload */}
              {activeTab === 'my-drive' && !isSearching && (
                <div className="flex items-center ml-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#E25E00] disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg shadow-[#FF6B00]/20"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                    Fazer Upload
                  </button>
                </div>
              )}
            </div>

            {/* Breadcrumb */}
            {activeTab === 'my-drive' && breadcrumb.length > 0 && !isSearching && (
              <div className="px-6 pb-3 flex items-center gap-1 overflow-x-auto">
                {breadcrumb.map((crumb, idx) => (
                  <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                    {idx > 0 && <ChevronRight size={14} className="text-[#B3B3B3]/40" />}
                    <button
                      onClick={() => navigateToBreadcrumb(idx)}
                      className={`text-sm px-1.5 py-0.5 rounded transition-colors ${
                        idx === breadcrumb.length - 1
                          ? 'text-white font-medium'
                          : 'text-[#B3B3B3] hover:text-white'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="px-6 pb-3">
                <span className="text-xs text-[#B3B3B3]">
                  Resultados para "<span className="text-white">{debouncedSearch}</span>"
                </span>
              </div>
            )}

            {/* File area */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loading ? (
                /* Skeleton */
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </div>
                )
              ) : files.length === 0 ? (
                /* Empty state */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="p-5 bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] mb-5">
                    {isSearching ? (
                      <Search size={40} className="text-[#B3B3B3]/40" />
                    ) : (
                      <FilePlus2 size={40} className="text-[#B3B3B3]/40" />
                    )}
                  </div>
                  <h3 className="text-white font-medium mb-1">
                    {isSearching ? 'Nenhum resultado encontrado' : 'Pasta vazia'}
                  </h3>
                  <p className="text-[#B3B3B3] text-sm max-w-xs">
                    {isSearching
                      ? 'Tente usar termos diferentes para encontrar seus arquivos.'
                      : 'Essa pasta ainda não possui nenhum arquivo ou subpasta.'}
                  </p>
                </motion.div>
              ) : viewMode === 'grid' ? (
                /* Grid view */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  <AnimatePresence mode="popLayout">
                    {files.map((file, i) => {
                      const { Icon, color } = getFileIcon(file.mimeType);
                      return (
                        <motion.button
                          key={file.id}
                          custom={i}
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          onClick={() => handleFileClick(file)}
                          className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-4 text-left hover:border-[#FF6B00]/30 hover:bg-[#1C1C1C]/80 transition-all duration-200 group focus:outline-none focus:ring-1 focus:ring-[#FF6B00]/40"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
                            style={{ backgroundColor: `${color}15` }}
                          >
                            <Icon size={20} style={{ color }} />
                          </div>
                          <p className="text-white text-sm font-medium truncate mb-1 group-hover:text-[#FF6B00] transition-colors">
                            {truncate(file.name, 28)}
                          </p>
                          <p className="text-[#B3B3B3]/60 text-xs">{formatDate(file.modifiedTime)}</p>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                /* List view */
                <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden">
                  {/* Table header */}
                  <div className="flex items-center gap-4 px-4 py-3 border-b border-[#2E2E2E] text-xs text-[#B3B3B3]/60 uppercase tracking-wider font-medium">
                    <div className="w-8" />
                    <div className="flex-1">Nome</div>
                    <div className="w-32 hidden md:block">Proprietário</div>
                    <div className="w-28 hidden md:block">Modificado</div>
                    <div className="w-20 hidden md:block text-right">Tamanho</div>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {files.map((file, i) => {
                      const { Icon, color } = getFileIcon(file.mimeType);
                      return (
                        <motion.button
                          key={file.id}
                          custom={i}
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          onClick={() => handleFileClick(file)}
                          className="w-full flex items-center gap-4 px-4 py-3 border-b border-[#2E2E2E]/50 last:border-b-0 hover:bg-[#2E2E2E]/30 transition-colors text-left group focus:outline-none"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}15` }}
                          >
                            <Icon size={16} style={{ color }} />
                          </div>
                          <div className="flex-1 truncate">
                            <span className="text-sm text-white group-hover:text-[#FF6B00] transition-colors">
                              {file.name}
                            </span>
                          </div>
                          <div className="w-32 text-xs text-[#B3B3B3] hidden md:block truncate">
                            {file.owners?.[0]?.displayName || '—'}
                          </div>
                          <div className="w-28 text-xs text-[#B3B3B3] hidden md:block">
                            {formatDate(file.modifiedTime)}
                          </div>
                          <div className="w-20 text-xs text-[#B3B3B3] hidden md:block text-right">
                            {file.size ? formatBytes(parseInt(file.size, 10)) : '—'}
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Load more */}
              {nextPageToken && !loading && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => fetchFiles(currentFolderId, nextPageToken)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl text-sm text-white hover:border-[#FF6B00]/30 hover:text-[#FF6B00] transition-all disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── File Preview Panel ── */}
      <AnimatePresence>
        {previewFile && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="fixed inset-0 bg-black/60 z-50"
            />

            {/* Panel */}
            <motion.div
              variants={slideRight}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#1C1C1C] border-l border-[#2E2E2E] z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2E2E2E] shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const { Icon, color } = getFileIcon(previewFile.mimeType);
                      return <Icon size={18} style={{ color }} />;
                    })()}
                    <h3 className="text-white font-medium text-sm truncate">{previewFile.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {previewFile.owners?.[0] && (
                      <span className="text-xs text-[#B3B3B3]">
                        {previewFile.owners[0].displayName}
                      </span>
                    )}
                    <span className="text-xs text-[#B3B3B3]/50">
                      {formatDate(previewFile.modifiedTime)}
                    </span>
                    {previewFile.size && (
                      <span className="text-xs text-[#B3B3B3]/50">
                        {formatBytes(parseInt(previewFile.size, 10))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {previewFile.webContentLink && (
                    <a
                      href={previewFile.webContentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#2E2E2E] hover:bg-[#3E3E3E] text-[#B3B3B3] hover:text-white transition-colors"
                      title="Baixar Arquivo"
                      download
                    >
                      <Download size={16} />
                    </a>
                  )}
                  {previewFile.webViewLink && (
                    <a
                      href={previewFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#2E2E2E] hover:bg-[#3E3E3E] text-[#B3B3B3] hover:text-white transition-colors"
                      title="Abrir no Google Drive"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-2 rounded-lg bg-[#2E2E2E] hover:bg-[#3E3E3E] text-[#B3B3B3] hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 p-4 overflow-hidden">{getPreviewContent(previewFile)}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
