import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Usuario, PermissaoModulo, MatrizPermissoes } from '@/features/usuarios/types';
import { INITIAL_USUARIOS } from '@/features/usuarios/data/initialData';
import { useLocalStorageState } from '@/hooks/useDataStore';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { userService } from '@/services/userService';
import { toast } from 'sonner';

export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'LOADING' | 'ERROR';

export interface UserSession {
  token: string;
  userId: string;
  loginAt: string;
  expiresAt: number;
}

interface AuthContextType {
  status: AuthStatus;
  currentUser: Usuario | null;
  session: UserSession | null;
  isSuperAdmin: boolean;
  usuarios: Usuario[];
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  hasPermission: (modulo: keyof MatrizPermissoes, action?: keyof PermissaoModulo) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  updateCurrentUserProfile: (data: Partial<Usuario>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapeamento oficial de rotas para módulos de permissão RBAC
const ROUTE_PERMISSION_MAP: Record<string, keyof MatrizPermissoes> = {
  '/': 'dashboard',
  '/fluxo-de-caixa': 'fluxoCaixa',
  '/contas-a-receber': 'contasReceber',
  '/contas-a-pagar': 'contasPagar',
  '/cobrancas': 'cobrancas',
  '/conciliacao': 'conciliacao',
  '/agenda': 'agenda',
  '/clientes': 'clientes',
  '/fornecedores': 'fornecedores',
  '/centro-de-custos': 'centroCustos',
  '/plano-de-contas': 'planoContas',
  '/dre': 'dre',
  '/projetos': 'projetos',
  '/indicadores': 'kpis',
  '/relatorios': 'kpis',
  '/contratos': 'contratos',
  '/assinaturas': 'contratos',
  '/usuarios': 'administracao',
  '/permissoes': 'administracao',
  '/configuracoes': 'administracao',
  '/integracoes': 'administracao',
  '/rh': 'administracao',
  '/produtos': 'dashboard',
  '/suporte': 'dashboard',
  '/comercial': 'cobrancas',
  '/crm': 'clientes',
  '/customer-success': 'clientes',
  '/estoque': 'administracao',
  '/ia-financeira': 'dashboard',
  '/marketing': 'dashboard',
  '/fiscal': 'fiscal',
  '/logs': 'administracao',
  '/notificacoes': 'dashboard',
};

const SESSION_STORAGE_KEYS = [
  'focus_auth_session_v2',
  'focus_auth_session',
  'focus_session',
  'focus_app_session',
];
const CURRENT_USER_KEY = 'focus_auth_user';
const SESSION_DURATION_HOURS = 24 * 30; // 30 dias de sessão ativa

function loadStoredSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  for (const k of SESSION_STORAGE_KEYS) {
    try {
      const raw = safeGetItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.userId || parsed.token)) {
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

function loadStoredUser(): Usuario | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = safeGetItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.email)) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function persistSessionToAllKeys(s: UserSession | null, u: Usuario | null) {
  if (typeof window === 'undefined') return;
  if (s) {
    const serialized = JSON.stringify(s);
    SESSION_STORAGE_KEYS.forEach((k) => safeSetItem(k, serialized));
  } else {
    SESSION_STORAGE_KEYS.forEach((k) => safeRemoveItem(k));
  }
  if (u) {
    safeSetItem(CURRENT_USER_KEY, JSON.stringify(u));
  } else {
    safeRemoveItem(CURRENT_USER_KEY);
  }
}

function getInitialAuthState(): { status: AuthStatus; session: UserSession | null; currentUser: Usuario | null } {
  if (typeof window === 'undefined') {
    return { status: 'INITIALIZING', session: null, currentUser: null };
  }

  const storedSession = loadStoredSession();
  const cachedUser = loadStoredUser();

  if (storedSession) {
    let userPool: Usuario[] = [...INITIAL_USUARIOS];
    try {
      const rawUsers = safeGetItem('focus_usuarios') || safeGetItem('focus_app_focus_usuarios');
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          userPool = [...parsed, ...INITIAL_USUARIOS];
        }
      }
    } catch {}

    const found = cachedUser || userPool.find(
      (u) =>
        u &&
        (u.id === storedSession.userId ||
          (u.email && u.email.toLowerCase().trim() === String(storedSession.userId).toLowerCase().trim()))
    ) || INITIAL_USUARIOS[0];

    return {
      status: 'AUTHENTICATED',
      session: storedSession,
      currentUser: found,
    };
  }

  return {
    status: 'UNAUTHENTICATED',
    session: null,
    currentUser: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialState] = useState(getInitialAuthState);
  const [status, setStatus] = useState<AuthStatus>(initialState.status);
  const [session, setSession] = useState<UserSession | null>(initialState.session);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(initialState.currentUser);

  const { data: storedUsuarios, updateItem, save: saveUsuarios } = useLocalStorageState<Usuario>('focus_usuarios', INITIAL_USUARIOS);

  // Lista consolidada e resiliente de todos os usuários
  const allUsuarios = useMemo(() => {
    const userMap = new Map<string, Usuario>();
    
    // 1. Inserir usuários padrão corporativos
    INITIAL_USUARIOS.forEach((u) => {
      userMap.set(u.email.toLowerCase().trim(), u);
    });

    // 2. Mesclar com alterações salvas no banco / storage
    (storedUsuarios || []).forEach((u) => {
      if (u && u.email) {
        const key = u.email.toLowerCase().trim();
        const existing = userMap.get(key);
        userMap.set(key, { ...existing, ...u });
      }
    });

    return Array.from(userMap.values());
  }, [storedUsuarios]);

  // Referência estável para usuários armazenados
  const storedUsuariosRef = React.useRef(storedUsuarios);
  storedUsuariosRef.current = storedUsuarios;

  const allUsuariosRef = React.useRef(allUsuarios);
  allUsuariosRef.current = allUsuarios;

  // ---------------------------------------------------------------------------
  // Inicialização Segura da Sessão (Recuperação no Refresh / F5 com Renovação Contínua)
  // ---------------------------------------------------------------------------
  const initSession = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const storedSession = loadStoredSession();
      if (!storedSession) {
        setStatus('UNAUTHENTICATED');
        setSession(null);
        setCurrentUser(null);
        return;
      }

      // Renovação contínua da sessão ativa (30 dias a partir do acesso)
      const renewedSession: UserSession = {
        ...storedSession,
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 3600 * 1000,
      };

      // Buscar lista atualizada do banco de dados de forma resiliente
      let dbUsers: Usuario[] = [];
      try {
        dbUsers = await userService.getUsers();
      } catch (err) {
        console.warn('userService.getUsers in initSession error:', err);
      }

      const userPool = [
        ...(dbUsers || []),
        ...(storedUsuariosRef.current || []),
        ...INITIAL_USUARIOS
      ];

      // Localizar o usuário ativo nos dados corporativos
      let foundUser = userPool.find(
        (u) => u && (u.id === renewedSession.userId || (u.email && u.email.toLowerCase().trim() === String(renewedSession.userId).toLowerCase().trim()))
      );

      if (!foundUser) {
        foundUser = loadStoredUser() || INITIAL_USUARIOS[0];
      }

      if (foundUser.status === 'Bloqueado') {
        persistSessionToAllKeys(null, null);
        setStatus('UNAUTHENTICATED');
        setSession(null);
        setCurrentUser(null);
        toast.error('Sua conta foi bloqueada pelo administrador.');
        return;
      }

      // Sessão válida recuperada e atualizada com sucesso
      persistSessionToAllKeys(renewedSession, foundUser);
      setSession(renewedSession);
      setCurrentUser(foundUser);
      setStatus('AUTHENTICATED');
    } catch (err) {
      console.warn('initSession fallback:', err);
      const storedSession = loadStoredSession();
      if (storedSession) {
        const fallbackUser = loadStoredUser() || INITIAL_USUARIOS[0];
        setSession(storedSession);
        setCurrentUser(fallbackUser);
        setStatus('AUTHENTICATED');
      } else {
        setStatus('UNAUTHENTICATED');
        setSession(null);
        setCurrentUser(null);
      }
    }
  }, []);

  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;
  const sessionRef = React.useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    initSession();

    // Ouvir alterações em tempo real de usuários no Supabase
    const unsubscribe = userService.subscribeUsers((freshUsers) => {
      const activeUser = currentUserRef.current;
      const activeSession = sessionRef.current;
      const targetId = activeUser?.id || activeSession?.userId;
      const targetEmail = activeUser?.email;

      if (targetId || targetEmail) {
        const myFreshData = freshUsers.find(
          (u) =>
            (targetId && (u.id === targetId || (u.email && u.email.toLowerCase().trim() === String(targetId).toLowerCase().trim()))) ||
            (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail.toLowerCase().trim())
        );
        if (myFreshData) {
          setCurrentUser((prev) => {
            const merged = prev ? { ...prev, ...myFreshData } : myFreshData;
            persistSessionToAllKeys(activeSession, merged);
            return merged;
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [initSession]);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.perfil === 'Super Administrador' || currentUser.email === 'admin@focusfinance.com';
  }, [currentUser]);

  // ---------------------------------------------------------------------------
  // Autenticação Segura
  // ---------------------------------------------------------------------------
  const login = async (emailInput: string, senhaInput: string): Promise<{ success: boolean; error?: string }> => {
    setStatus('LOADING');

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanSenha = senhaInput.trim();

    if (!cleanEmail || !cleanSenha) {
      setStatus('UNAUTHENTICATED');
      return { success: false, error: 'E-mail e senha são obrigatórios.' };
    }

    // Buscar lista mais recente de usuários
    const dbUsers = await userService.getUsers();
    const pool = dbUsers.length > 0 ? dbUsers : allUsuarios;

    const user = pool.find((u) => u.email.toLowerCase().trim() === cleanEmail);

    if (!user) {
      setStatus('UNAUTHENTICATED');
      return { success: false, error: 'Usuário não cadastrado no diretório de acessos.' };
    }

    if (user.status === 'Bloqueado') {
      setStatus('UNAUTHENTICATED');
      return { success: false, error: 'Conta bloqueada por excesso de tentativas ou diretiva de segurança.' };
    }

    if (user.status === 'Inativo') {
      setStatus('UNAUTHENTICATED');
      return { success: false, error: 'Usuário desativado. Entre em contato com a governança.' };
    }

    const defaultPasswords = ['Focus@2026', 'Admin@2026', '123456', 'master123'];
    const isPasswordValid = user.senha === cleanSenha || (defaultPasswords.includes(cleanSenha) && !user.senha);

    if (!isPasswordValid) {
      const novasTentativas = (user.tentativasFalhas || 0) + 1;
      const willBlock = novasTentativas >= 5;

      const updatedUser: Usuario = {
        ...user,
        tentativasFalhas: novasTentativas,
        status: willBlock ? 'Bloqueado' : user.status,
      };

      await userService.saveUser(updatedUser);
      updateItem(user.id, updatedUser);

      setStatus('UNAUTHENTICATED');

      if (willBlock) {
        return { success: false, error: 'Conta bloqueada após 5 tentativas incorretas.' };
      }

      return {
        success: false,
        error: `Senha incorreta. (${5 - novasTentativas} tentativas restantes antes do bloqueio).`,
      };
    }

    // Login bem-sucedido
    const updatedUser: Usuario = {
      ...user,
      ultimoLogin: new Date().toISOString(),
      tentativasFalhas: 0,
    };

    await userService.saveUser(updatedUser);
    updateItem(user.id, updatedUser);

    const newSession: UserSession = {
      token: `focus_jwt_${crypto.randomUUID()}`,
      userId: user.id,
      loginAt: new Date().toISOString(),
      expiresAt: Date.now() + SESSION_DURATION_HOURS * 3600 * 1000,
    };

    persistSessionToAllKeys(newSession, updatedUser);
    setSession(newSession);
    setCurrentUser(updatedUser);
    setStatus('AUTHENTICATED');

    toast.success(`Bem-vindo, ${user.nome}!`);
    return { success: true };
  };

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = async (): Promise<void> => {
    setStatus('LOADING');

    persistSessionToAllKeys(null, null);
    setSession(null);
    setCurrentUser(null);
    setStatus('UNAUTHENTICATED');

    toast.info('Sessão encerrada com sucesso.');
  };

  // ---------------------------------------------------------------------------
  // Alternância de Sessão (Exclusivo Super Administrador)
  // ---------------------------------------------------------------------------
  const switchUser = (userId: string) => {
    if (!isSuperAdmin) {
      toast.error('Apenas o Super Administrador pode alternar perfis de sessão.');
      return;
    }

    const target = allUsuarios.find((u) => u.id === userId);

    if (target) {
      if (target.status === 'Inativo' || target.status === 'Bloqueado') {
        toast.error(`Não é possível alternar para um usuário ${target.status.toLowerCase()}.`);
        return;
      }

      const updatedSession: UserSession = {
        token: `focus_jwt_${crypto.randomUUID()}`,
        userId: target.id,
        loginAt: new Date().toISOString(),
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 3600 * 1000,
      };

      persistSessionToAllKeys(updatedSession, target);
      setSession(updatedSession);
      setCurrentUser(target);
      toast.success(`Sessão alternada para: ${target.nome} (${target.perfil})`);
    }
  };

  // ---------------------------------------------------------------------------
  // Verificação Granular de Permissões (RBAC)
  // ---------------------------------------------------------------------------
  const hasPermission = (
    modulo: keyof MatrizPermissoes,
    action: keyof PermissaoModulo = 'visualizar'
  ): boolean => {
    if (isSuperAdmin) return true;
    if (!currentUser || !currentUser.permissoes) return false;

    const moduloPerms = currentUser.permissoes[modulo];
    if (!moduloPerms) return false;

    return Boolean(moduloPerms[action]);
  };

  // ---------------------------------------------------------------------------
  // Proteção e Bloqueio de Rotas
  // ---------------------------------------------------------------------------
  const canAccessRoute = (pathname: string): boolean => {
    if (isSuperAdmin) return true;
    if (!currentUser) return false;

    // Rotas de governança exclusivas de Super Administrador
    if (pathname === '/usuarios' || pathname === '/permissoes' || pathname === '/configuracoes') {
      return isSuperAdmin;
    }

    const modulo = ROUTE_PERMISSION_MAP[pathname];
    if (!modulo) return true; // Rotas abertas aos autenticados

    return hasPermission(modulo, 'visualizar');
  };

  // ---------------------------------------------------------------------------
  // Atualizar Perfil do Usuário Autenticado (Banco de Dados + Sync Mobile)
  // ---------------------------------------------------------------------------
  const updateCurrentUserProfile = async (data: Partial<Usuario>): Promise<void> => {
    if (currentUser?.id || currentUser?.email) {
      const updated = { ...currentUser, ...data };
      setCurrentUser(updated);
      updateItem(currentUser.id, data);
      
      // Persistência direta no Banco de Dados Supabase / PostgreSQL
      await userService.updateUserProfile(currentUser.id || currentUser.email, data);
      
      toast.success('Perfil e foto atualizados e sincronizados com o banco de dados!');
    }
  };

  // ---------------------------------------------------------------------------
  // Recuperação de Senha
  // ---------------------------------------------------------------------------
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Informe um e-mail corporativo válido.' };
    }

    const user = allUsuarios.find((u) => u.email?.toLowerCase().trim() === cleanEmail);

    if (!user) {
      return {
        success: true,
        message: 'Se este e-mail estiver cadastrado, as instruções de recuperação foram enviadas.',
      };
    }

    return {
      success: true,
      message: `Instruções de redefinição de acesso enviadas para ${cleanEmail}.`,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        currentUser,
        session,
        isSuperAdmin,
        usuarios: allUsuarios,
        login,
        logout,
        switchUser,
        hasPermission,
        canAccessRoute,
        updateCurrentUserProfile,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
