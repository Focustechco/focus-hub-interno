import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Megaphone,
  MessageCircle,
  Users,
  Building,
  Trophy,
  Link as LinkIcon,
  FileText,
  Search,
  Cake,
  UserPlus,
  PhoneCall,
  Radio,
  Paperclip,
  Send,
  Heart,
  ThumbsUp,
  PartyPopper,
  ExternalLink,
  Mail,
  Copy,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Edit,
  Award,
  Star,
  Medal,
  Target,
  Zap,
  Calendar,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import api from "../services/api";
import {
  User,
  Post,
  Notification,
  NotificationType,
  NotificationPreferences,
  Role,
  Screen,
} from "../types";
import { useToast } from "../components/Toast";
import DiscordChat from "../components/DiscordChat";
import { WhatsappIcon } from "../components/icons";

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 127.14 96.36" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.1,53,91,65.69,84.69,65.69Z" />
  </svg>
);

interface MuralScreenProps {
  currentUser: User;
  posts?: Post[];
  users?: User[];
  setPosts?: (posts: Post[] | ((prev: Post[]) => Post[])) => void;
  setNotifications?: (
    notifications: (prev: Notification[]) => Notification[],
  ) => void;
  notificationPreferences?: { [userId: string]: NotificationPreferences };
  setActiveScreen?: (screen: Screen) => void;
}

const MuralScreen: React.FC<MuralScreenProps> = ({ currentUser, setActiveScreen }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [birthdays, setBirthdays] = useState([]);
  const [newHires, setNewHires] = useState([]);

  // Avisos State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    priority: "Normal",
  });
  const [isPosting, setIsPosting] = useState(false);
  const [isEditAnnouncementModalOpen, setIsEditAnnouncementModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState({
    title: "",
    content: "",
    priority: "Normal",
  });

  // Canais e Contatos State
  const [channels, setChannels] = useState<any[]>([]);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: "",
    description: "",
    type: "WhatsApp",
    url: "",
  });
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: "",
    job_title: "",
    sector: "",
    role: "user",
    whatsapp: "",
    email: "",
    birth_date: "", avatar_url: "",
  });
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Conquistas State
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [isEditAchievementModalOpen, setIsEditAchievementModalOpen] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [newAchievement, setNewAchievement] = useState({
    title: "",
    description: "",
    icon: "Trophy",
    awarded_to: "",
  });
  const [isCreatingAchievement, setIsCreatingAchievement] = useState(false);

  // Chat State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Socket Initialization
  useEffect(() => {
    const baseUrl =
      api.defaults.baseURL?.replace("/api", "") || "http://localhost:5000";
    const newSocket = io(baseUrl, {
      auth: { userId: currentUser.id },
    });

    setSocket(newSocket);

    newSocket.on("new_message", (msg: any) => {
      setMessages((prev) => {
        // Ignore if not related to the current chat (to be robust, we filter in UI, but let's just append)
        return [...prev, msg];
      });
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    });

    return () => {
      newSocket.close();
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchAnnouncements();
      api
        .get("/communication/dashboard/birthdays")
        .then((res) => setBirthdays(res.data))
        .catch(console.error);
      api
        .get("/communication/dashboard/new-hires")
        .then((res) => setNewHires(res.data))
        .catch(console.error);
    } else if (activeTab === "avisos") {
      fetchAnnouncements();
    } else if (activeTab === "setores") {
      fetchChannels();
      api
        .get("/communication/contacts")
        .then((res) =>
          setContacts(res.data.filter((c: any) => c.id !== currentUser.id)),
        )
        .catch(console.error);
    } else if (activeTab === "chat") {
      // Load contacts for chat
      api
        .get("/communication/contacts")
        .then((res) =>
          setContacts(res.data.filter((c: any) => c.id !== currentUser.id)),
        )
        .catch(console.error);
    } else if (activeTab === "conquistas") {
      fetchAchievements();
      api
        .get("/communication/contacts")
        .then((res) =>
          setContacts(res.data.filter((c: any) => c.id !== currentUser.id)),
        )
        .catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "chat" && selectedContact && socket) {
      socket.emit(
        "fetch_messages",
        { contactId: selectedContact.id },
        (response: any) => {
          if (response.status === "success") {
            setMessages(response.messages);
            setTimeout(
              () =>
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
              100,
            );
          }
        },
      );
    }
  }, [activeTab, selectedContact, socket]);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get("/communication/announcements");
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await api.get("/communication/achievements");
      setAchievements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await api.get("/communication/channels");
      setChannels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.name.trim() || !newChannel.url.trim()) return;

    setIsCreatingChannel(true);
    try {
      await api.post("/communication/channels", {
        name: newChannel.name,
        description: newChannel.description,
        type: newChannel.type,
        url: newChannel.url,
      });
      setIsChannelModalOpen(false);
      setNewChannel({ name: "", description: "", type: "WhatsApp", url: "" });
      fetchChannels();
      toast.success("Canal criado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar canal.");
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost.title.trim() || !editPost.content.trim()) return;

    try {
      await api.put(`/communication/announcements/${editingAnnouncementId}`, editPost);
      setIsEditAnnouncementModalOpen(false);
      setEditingAnnouncementId(null);
      setEditPost({ title: "", content: "", priority: "Normal" });
      fetchAnnouncements();
      toast.success("Aviso editado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao editar aviso.");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este aviso?")) return;
    try {
      await api.delete(`/communication/announcements/${id}`);
      fetchAnnouncements();
      toast.success("Aviso excluído com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir aviso.");
    }
  };

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await api.post("/communication/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewContact({ ...newContact, avatar_url: response.data.avatar_url });
      toast.success("Foto enviada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar a foto");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) return;

    setIsCreatingContact(true);
    try {
      await api.post("/communication/contacts", newContact);
      setIsContactModalOpen(false);
      setNewContact({
        name: "",
        job_title: "",
        sector: "",
        role: "user",
        whatsapp: "",
        email: "",
        birth_date: "", avatar_url: "",
      });
      api
        .get("/communication/contacts")
        .then((res) =>
          setContacts(res.data.filter((c: any) => c.id !== currentUser.id)),
        )
        .catch(console.error);
      toast.success("Contato criado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar contato.");
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim() || !editingContactId) return;

    setIsCreatingContact(true);
    try {
      await api.put(`/communication/contacts/${editingContactId}`, newContact);
      setIsEditContactModalOpen(false);
      setEditingContactId(null);
      setNewContact({
        name: "",
        job_title: "",
        sector: "",
        role: "user",
        whatsapp: "",
        email: "",
        birth_date: "", avatar_url: "",
      });
      api
        .get("/communication/contacts")
        .then((res) =>
          setContacts(res.data.filter((c: any) => c.id !== currentUser.id)),
        )
        .catch(console.error);
      toast.success("Contato atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar contato.");
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    try {
      await api.delete(`/communication/contacts/${id}`);
      api
        .get("/communication/contacts")
        .then((res) =>
          setContacts(res.data.filter((c: any) => c.id !== currentUser.id)),
        )
        .catch(console.error);
      toast.success("Contato excluído com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir contato.");
    }
  };

  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAchievement.title.trim() || !newAchievement.description.trim()) return;

    setIsCreatingAchievement(true);
    try {
      await api.post("/communication/achievements", newAchievement);
      setIsAchievementModalOpen(false);
      setNewAchievement({ title: "", description: "", icon: "Trophy", awarded_to: "" });
      fetchAchievements();
      toast.success("Conquista criada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar conquista.");
    } finally {
      setIsCreatingAchievement(false);
    }
  };

  const handleEditAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAchievement.title.trim() || !newAchievement.description.trim()) return;

    try {
      await api.put(`/communication/achievements/${editingAchievementId}`, newAchievement);
      setIsEditAchievementModalOpen(false);
      setEditingAchievementId(null);
      setNewAchievement({ title: "", description: "", icon: "Trophy", awarded_to: "" });
      fetchAchievements();
      toast.success("Conquista editada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao editar conquista.");
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conquista?")) return;
    try {
      await api.delete(`/communication/achievements/${id}`);
      fetchAchievements();
      toast.success("Conquista excluída com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir conquista.");
    }
  };

  const getAchievementIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Trophy, Award, Star, Medal, Target, Zap, CheckCircle2, Heart,
    };
    return icons[iconName] || Trophy;
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este canal?")) return;
    try {
      await api.delete(`/communication/channels/${id}`);
      fetchChannels();
      toast.success("Canal excluído com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir canal.");
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    setIsPosting(true);
    try {
      await api.post("/communication/announcements", newPost);
      setNewPost({ title: "", content: "", priority: "Normal" });
      fetchAnnouncements();
      toast.success("Aviso publicado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao publicar aviso.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleReaction = async (annId: string, reactionType: string) => {
    try {
      await api.post(`/communication/announcements/${annId}/reactions`, {
        reaction_type: reactionType,
      });
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedContact || !socket) return;

    socket.emit(
      "send_message",
      {
        receiverId: selectedContact.id,
        content: messageText,
      },
      (response: any) => {
        if (response.status === "success") {
          setMessageText("");
          setTimeout(
            () =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
            100,
          );
        }
      },
    );
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard Inicial", icon: Home },
    { id: "avisos", label: "Mural de Avisos", icon: Megaphone },
    { id: "chat", label: "Chat Interno", icon: MessageCircle },
    { id: "setores", label: "Canais e Contatos", icon: Building },
    { id: "conquistas", label: "Conquistas", icon: Trophy },
  ];

  const filteredContacts = contacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sector?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filter messages for current conversation
  const currentConversationMessages = messages.filter(
    (m) =>
      (m.sender_id === currentUser.id &&
        m.receiver_id === selectedContact?.id) ||
      (m.sender_id === selectedContact?.id && m.receiver_id === currentUser.id),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation */}
      <div className="h-16 bg-white dark:bg-[#1C1C1C] border-b border-gray-200 dark:border-[#2E2E2E] flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center space-x-6 flex-1 overflow-hidden">
          <div className="flex items-center shrink-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Central de</h2>
            <h2 className="text-xl font-bold text-[#FF6B00] ml-1">
              Comunicação
            </h2>
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-[#333] shrink-0 hidden md:block"></div>
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide flex-1 items-center pb-1 pt-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-full transition-colors whitespace-nowrap text-sm shrink-0 ${activeTab === tab.id ? "bg-[#FF6B00] text-white font-bold" : "text-gray-500 dark:text-[#888] hover:bg-[#FF6B00]/10 hover:text-[#FF6B00]"}`}
                >
                  <Icon
                    className={`w-4 h-4 mr-2 ${activeTab === tab.id ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-[#888]"}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-4 pl-4 ml-2 border-l border-gray-200 dark:border-[#2E2E2E] shrink-0 hidden md:flex">
          <div className="flex items-center space-x-3">

            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                {currentUser.name.split(" ")[0]}
              </p>
              <p className="text-[10px] text-green-500 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>{" "}
                Online
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-8 pb-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    id: "avisos",
                    title: "Comunicados",
                    desc: "Avisos importantes",
                    icon: Megaphone,
                    color: "text-[#FF6B00]",
                    bg: "bg-[#FF6B00]",
                  },
                  {
                    id: "chat",
                    title: "Chat Interno",
                    desc: "Converse com a equipe",
                    icon: DiscordIcon,
                    color: "text-[#5865F2]",
                    bg: "bg-[#5865F2]",
                  },
                  {
                    id: "setores",
                    title: "Canais e Contatos",
                    desc: "Canais e diretório",
                    icon: Radio,
                    color: "text-purple-500",
                    bg: "bg-purple-500",
                  },
                  {
                    id: "agenda",
                    title: "Marcar Reunião",
                    desc: "Ir para a Agenda",
                    icon: Calendar,
                    color: "text-green-500",
                    bg: "bg-green-500",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    onClick={() => {
                      if (item.id === "agenda" && setActiveScreen) {
                        setActiveScreen("agenda");
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className="bg-white dark:bg-[#1C1C1C] p-5 rounded-2xl border border-gray-200 dark:border-[#2E2E2E] cursor-pointer hover:border-[#FF6B00] hover:shadow-lg hover:shadow-[#FF6B00]/10 transition-all hover:-translate-y-1 flex flex-col justify-between h-36"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${item.bg} bg-opacity-20 flex items-center justify-center mb-4`}
                    >
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <h3 className="text-gray-900 dark:text-white font-bold text-lg leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 dark:text-[#888] text-xs mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-[#2E2E2E] p-6 shadow-lg flex flex-col">
                  <h3 className="text-gray-900 dark:text-white font-bold mb-6 flex items-center pb-3 border-b border-gray-200 dark:border-[#2E2E2E]">
                    <Megaphone className="w-5 h-5 mr-2 text-[#FF6B00]" />{" "}
                    Últimos Avisos
                  </h3>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {announcements.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-[#888]">Nenhum aviso recente.</p>
                    ) : (
                      announcements.slice(0, 3).map((ann) => (
                        <div key={ann.id} className="border-l-2 border-[#FF6B00] pl-4">
                          <p className="text-xs text-[#FF6B00] font-bold mb-1">
                            {new Date(ann.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase()}
                          </p>
                          <p 
                            className="text-gray-900 dark:text-white text-sm hover:underline cursor-pointer line-clamp-2"
                            onClick={() => setActiveTab("avisos")}
                            title={ann.title}
                          >
                            {ann.title}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("avisos")}
                    className="mt-6 w-full py-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-semibold transition-colors"
                  >
                    Ver todos os avisos
                  </button>
                </div>

                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-[#2E2E2E] p-6 shadow-lg">
                  <h3 className="text-gray-900 dark:text-white font-bold mb-6 flex items-center pb-3 border-b border-gray-200 dark:border-[#2E2E2E]">
                    <Cake className="w-5 h-5 mr-2 text-pink-500" />{" "}
                    Aniversariantes
                  </h3>
                  {birthdays.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-[#888] text-center py-4">
                      Nenhum aniversariante recente.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {birthdays.map((b: any) => (
                        <li key={b.id} className="flex items-center space-x-3">
                          <img
                            src={
                              b.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=2A2A2A&color=fff`
                            }
                            alt={b.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-gray-900 dark:text-white text-sm font-bold">
                              {b.name}
                            </p>
                            <p className="text-gray-500 dark:text-[#888] text-xs">
                              {new Date(b.birth_date).toLocaleDateString(
                                "pt-BR",
                                { day: "2-digit", month: "short" },
                              )}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col space-y-6">
                  <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-[#2E2E2E] p-6 shadow-lg flex-1">
                    <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center">
                      <UserPlus className="w-5 h-5 mr-2 text-green-500" /> Novos
                      Colaboradores
                    </h3>
                    {newHires.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-[#888]">
                        Nenhum colaborador recente.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {newHires.map((h: any) => (
                          <li
                            key={h.id}
                            className="flex items-center space-x-3 bg-[#FF6B00]/10 p-2 rounded-lg"
                          >
                            <img
                              src={
                                h.avatar_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(h.name)}&background=FF6B00&color=fff`
                              }
                              alt={h.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-gray-900 dark:text-white text-xs font-bold">
                                {h.name}
                              </p>
                              <p className="text-gray-500 dark:text-[#888] text-[10px] uppercase">
                                {h.job_title || h.sector || "Equipe"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-[#2E2E2E] p-6 shadow-lg">
                    <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center">
                      <LinkIcon className="w-5 h-5 mr-2 text-blue-500" /> Links
                      Úteis
                    </h3>
                    <ul className="space-y-3">
                      <li className="bg-[#FF6B00]/10 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#FF6B00]/20 transition-colors">
                        <FileText className="w-4 h-4 text-[#FF6B00]" />
                        <span className="text-gray-900 dark:text-white text-sm font-semibold">
                          Manual do Colaborador
                        </span>
                      </li>
                      <li className="bg-[#FF6B00]/10 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#FF6B00]/20 transition-colors">
                        <LinkIcon className="w-4 h-4 text-[#FF6B00]" />
                        <span className="text-gray-900 dark:text-white text-sm font-semibold">
                          Google Drive
                        </span>
                      </li>
                      <li className="bg-[#FF6B00]/10 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#FF6B00]/20 transition-colors">
                        <LinkIcon className="w-4 h-4 text-[#FF6B00]" />
                        <span className="text-gray-900 dark:text-white text-sm font-semibold">
                          Portal RH
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "avisos" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 pb-10 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2 flex items-center">
                    <Megaphone className="w-8 h-8 mr-3 text-[#FF6B00]" /> Mural
                    de Avisos
                  </h1>
                  <p className="text-gray-500 dark:text-[#888]">
                    Acompanhe os comunicados oficiais e notícias da equipe.
                  </p>
                </div>
              </div>

              {currentUser.role === Role.ADMIN && (
                <div className="border border-gray-200 dark:border-[#2E2E2E] shadow-sm rounded-2xl p-6 mb-8 bg-white dark:bg-[#1C1C1C]">
                  <form onSubmit={handleCreateAnnouncement}>
                    <input
                      type="text"
                      placeholder="Título do Comunicado..."
                      value={newPost.title}
                      onChange={(e) =>
                        setNewPost({ ...newPost, title: e.target.value })
                      }
                      className="w-full bg-transparent text-gray-900 dark:text-white text-xl font-bold mb-4 focus:outline-none placeholder-[#B3B3B3]"
                    />
                    <textarea
                      placeholder="Escreva a mensagem oficial..."
                      value={newPost.content}
                      onChange={(e) =>
                        setNewPost({ ...newPost, content: e.target.value })
                      }
                      className="w-full bg-gray-50 dark:bg-[#0E0E0E] text-gray-900 dark:text-white p-4 rounded-xl resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] mb-4 border border-gray-200 dark:border-[#2E2E2E]"
                    />
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-[#2E2E2E] pt-4">
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          className="flex items-center text-gray-500 dark:text-[#888] hover:text-[#FF6B00] transition-colors text-sm"
                        >
                          <Paperclip className="w-4 h-4 mr-2" /> Anexar
                        </button>
                        <select
                          value={newPost.priority}
                          onChange={(e) =>
                            setNewPost({ ...newPost, priority: e.target.value })
                          }
                          className="bg-gray-50 dark:bg-[#0E0E0E] text-sm rounded-lg px-3 py-1 border border-gray-200 dark:border-[#2E2E2E] focus:outline-none"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Importante">Importante</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={isPosting}
                        className="bg-[#FF6B00] hover:bg-[#FF8C33] text-white px-6 py-2 rounded-full font-bold flex items-center transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 mr-2" />{" "}
                        {isPosting ? "Publicando..." : "Publicar Aviso"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                {announcements.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-[#888]">
                    Nenhum aviso publicado ainda.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`bg-white dark:bg-[#1C1C1C] border ${ann.priority === "Urgente" ? "border-red-500" : ann.priority === "Importante" ? "border-yellow-500" : "border-gray-200 dark:border-[#2E2E2E]"} rounded-2xl p-6 shadow-sm relative`}
                    >
                      {ann.priority !== "Normal" && (
                        <span
                          className={`absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-bold text-white ${ann.priority === "Urgente" ? "bg-red-500" : "bg-yellow-500"}`}
                        >
                          {ann.priority.toUpperCase()}
                        </span>
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <img
                            src={
                              ann.author_avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(ann.author_name)}&background=FF6B00&color=fff`
                            }
                            alt={ann.author_name}
                            className="w-12 h-12 rounded-full mr-4"
                          />
                          <div>
                            <h4 className="font-bold">{ann.author_name}</h4>
                            <div className="flex items-center text-gray-500 dark:text-[#888] text-xs space-x-2">
                              <span>{ann.author_role || "Administrador"}</span>
                              <span>•</span>
                              <span>{ann.author_sector || "Geral"}</span>
                              <span>•</span>
                              <span>
                                {new Date(ann.created_at).toLocaleString(
                                  "pt-BR",
                                  { dateStyle: "short", timeStyle: "short" },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        {(currentUser?.role === "admin" ||
                          currentUser?.role === "manager" ||
                          currentUser?.role === "ADMIN" ||
                          currentUser?.role === "MANAGER" ||
                          currentUser?.id === ann.author_id) && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingAnnouncementId(ann.id);
                                setEditPost({
                                  title: ann.title,
                                  content: ann.content,
                                  priority: ann.priority || "Normal",
                                });
                                setIsEditAnnouncementModalOpen(true);
                              }}
                              className="text-gray-500 dark:text-[#B3B3B3] hover:text-[#FF6B00] transition-colors p-1 rounded-lg hover:bg-gray-100 dark:bg-[#2A2A2A]"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="text-gray-500 dark:text-[#B3B3B3] hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:bg-[#2A2A2A]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{ann.title}</h3>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {ann.content}
                      </p>
                      <div className="mt-6 border-t border-gray-100 pt-4 flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleReaction(ann.id, "like")}
                            className="flex items-center bg-gray-50 dark:bg-[#0E0E0E] hover:bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200 dark:border-[#2E2E2E]"
                          >
                            <ThumbsUp className="w-4 h-4 mr-2 text-blue-500" />{" "}
                            Curti
                          </button>
                          <button
                            onClick={() => handleReaction(ann.id, "clap")}
                            className="flex items-center bg-gray-50 dark:bg-[#0E0E0E] hover:bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200 dark:border-[#2E2E2E]"
                          >
                            👏 Parabéns
                          </button>
                          <button
                            onClick={() => handleReaction(ann.id, "heart")}
                            className="flex items-center bg-gray-50 dark:bg-[#0E0E0E] hover:bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200 dark:border-[#2E2E2E]"
                          >
                            <Heart className="w-4 h-4 mr-2 text-red-500" />{" "}
                            Gostei
                          </button>
                          <button
                            onClick={() => handleReaction(ann.id, "celebrate")}
                            className="flex items-center bg-gray-50 dark:bg-[#0E0E0E] hover:bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200 dark:border-[#2E2E2E]"
                          >
                            <PartyPopper className="w-4 h-4 mr-2 text-purple-500" />{" "}
                            Comemorar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "setores" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 pb-10 max-w-5xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                    <Building className="w-8 h-8 mr-3 text-[#FF6B00]" /> Canais e Contatos
                  </h1>
                  <p className="text-gray-500 dark:text-[#888]">
                    Acesso rápido aos grupos de comunicação da empresa.
                  </p>
                </div>
                <button
                  onClick={() => setIsChannelModalOpen(true)}
                  className="bg-[#FF6B00] hover:bg-[#FF8C33] text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Canal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500 dark:text-[#888]">
                    Nenhum canal configurado.
                  </div>
                ) : (
                  channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-lg hover:border-[#FF6B00] transition-colors group"
                    >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#2A2A2A] flex items-center justify-center">
                            {channel.type === "WhatsApp" ? (
                              <WhatsappIcon className="w-6 h-6 text-[#25D366]" />
                            ) : (
                              <Radio className="w-6 h-6 text-[#FF6B00]" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                          <span className="bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                            {channel.type}
                          </span>
                          <button
                            onClick={() => handleDeleteChannel(channel.id)}
                            className="text-gray-500 dark:text-[#888] hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {channel.name}
                      </h3>
                      <p className="text-gray-500 dark:text-[#888] text-sm mb-6 h-10 line-clamp-2">
                        {channel.description}
                      </p>
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold transition-colors flex items-center justify-center"
                      >
                        Acessar <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </div>
                  ))
                )}
              </div>

              {/* Contatos Integrados - Agenda Corporativa */}
              <div className="mt-16">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                      <Users className="w-8 h-8 mr-3 text-[#FF6B00]" /> Agenda
                      Corporativa
                    </h2>
                    <p className="text-gray-500 dark:text-[#888]">
                      Contatos de toda a equipe e diretoria.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center shadow-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Novo Contato
                  </button>
                </div>

                {/* Diretoria Section */}
                <div className="mb-12">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-[#2E2E2E] pb-2 text-center">
                    Diretoria
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredContacts
                      .filter(
                        (c) =>
                          c.role === "admin" ||
                          c.role === "manager" ||
                          c.job_title?.toLowerCase().includes("diretor") ||
                          c.job_title?.toLowerCase().includes("ceo"),
                      )
                      .map((contact) => (
                        <div
                          key={contact.id}
                          className="bg-white dark:bg-[#1C1C1C] border border-yellow-500/50 rounded-2xl p-6 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform relative group"
                        >
                          {(currentUser?.role === "admin" ||
                            currentUser?.role === "manager" ||
                            currentUser?.role === "ADMIN" ||
                            currentUser?.role === "MANAGER") && (
                            <div className="absolute top-3 right-3 flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingContactId(contact.id);
                                  setNewContact({
                                    name: contact.name, avatar_url: contact.avatar_url || "",
                                    job_title: contact.job_title || "",
                                    sector: contact.sector || "",
                                    role: contact.role || "user",
                                    whatsapp: contact.whatsapp || "",
                                    email: contact.email || "",
                                    birth_date: contact.birth_date ? new Date(contact.birth_date).toISOString().split('T')[0] : "",
                                  });
                                  setIsEditContactModalOpen(true);
                                }}
                                className="text-gray-500 dark:text-[#888] hover:text-[#FF6B00] transition-colors p-1 bg-gray-100 dark:bg-[#2A2A2A] rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-gray-500 dark:text-[#888] hover:text-red-500 transition-colors p-1 bg-gray-100 dark:bg-[#2A2A2A] rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <img
                            src={
                              contact.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=2A2A2A&color=fff`
                            }
                            alt={contact.name}
                            className="w-20 h-20 rounded-full mb-4 border-2 border-yellow-500"
                          />
                          <h3 className="text-gray-900 dark:text-white font-bold text-lg">
                            {contact.name}
                          </h3>
                          <p className="text-yellow-500 text-sm font-semibold mb-1">
                            {contact.job_title || "Diretor"}
                          </p>
                          <p className="text-gray-500 dark:text-[#888] text-xs mb-4">
                            {contact.sector || "Geral"}
                          </p>

                          <div className="flex space-x-3 mt-auto w-full">
                            {contact.whatsapp && (
                              <a
                                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />{" "}
                                WhatsApp
                              </a>
                            )}
                            <button
                              onClick={() => copyToClipboard(contact.email)}
                              className="bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-white p-2 rounded-lg transition-colors"
                              title="Copiar Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Todos Contatos */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-[#2E2E2E] pb-2 text-center">
                    Colaboradores
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredContacts
                      .filter(
                        (c) =>
                          c.role !== "admin" &&
                          c.role !== "manager" &&
                          !c.job_title?.toLowerCase().includes("diretor") &&
                          !c.job_title?.toLowerCase().includes("ceo"),
                      )
                      .map((contact) => (
                        <div
                          key={contact.id}
                          className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform relative group"
                        >
                          {(currentUser?.role === "admin" ||
                            currentUser?.role === "manager" ||
                            currentUser?.role === "ADMIN" ||
                            currentUser?.role === "MANAGER") && (
                            <div className="absolute top-3 right-3 flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingContactId(contact.id);
                                  setNewContact({
                                    name: contact.name, avatar_url: contact.avatar_url || "",
                                    job_title: contact.job_title || "",
                                    sector: contact.sector || "",
                                    role: contact.role || "user",
                                    whatsapp: contact.whatsapp || "",
                                    email: contact.email || "",
                                  });
                                  setIsEditContactModalOpen(true);
                                }}
                                className="text-gray-500 dark:text-[#888] hover:text-[#FF6B00] transition-colors p-1 bg-gray-100 dark:bg-[#2A2A2A] rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-gray-500 dark:text-[#888] hover:text-red-500 transition-colors p-1 bg-gray-100 dark:bg-[#2A2A2A] rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <img
                            src={
                              contact.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=2A2A2A&color=fff`
                            }
                            alt={contact.name}
                            className="w-20 h-20 rounded-full mb-4"
                          />
                          <h3 className="text-gray-900 dark:text-white font-bold text-lg">
                            {contact.name}
                          </h3>
                          <p className="text-[#FF6B00] text-sm font-semibold mb-1">
                            {contact.job_title || "Colaborador"}
                          </p>
                          <p className="text-gray-500 dark:text-[#888] text-xs mb-4">
                            {contact.sector || "Equipe"}
                          </p>

                          <div className="flex space-x-3 mt-auto w-full">
                            {contact.phone && (
                              <button
                                onClick={() => copyToClipboard(contact.phone)}
                                className="flex-1 bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
                              >
                                <Copy className="w-3 h-3 mr-1" /> Tel
                              </button>
                            )}
                            {contact.whatsapp && (
                              <a
                                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />{" "}
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "conquistas" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-6 pb-10"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2 flex items-center">
                    <Trophy className="w-8 h-8 mr-3 text-yellow-500" /> Conquistas
                    da Equipe
                  </h1>
                  <p className="text-gray-500 dark:text-[#888]">Celebre as conquistas e o reconhecimento da equipe.</p>
                </div>
                {(currentUser?.role === "admin" ||
                  currentUser?.role === "manager" ||
                  currentUser?.role === "ADMIN" ||
                  currentUser?.role === "MANAGER") && (
                  <button
                    onClick={() => setIsAchievementModalOpen(true)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 dark:text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg transition-all"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Conquista
                  </button>
                )}
              </div>

              {achievements.length === 0 ? (
                <div className="text-center py-20">
                  <Trophy className="w-16 h-16 mx-auto text-gray-400 dark:text-[#555] mb-4" />
                  <p className="text-gray-500 dark:text-[#888] text-lg">Nenhuma conquista registrada ainda.</p>
                  <p className="text-gray-500 dark:text-[#666] text-sm mt-1">Crie a primeira conquista para celebrar a equipe!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((ach) => {
                    const IconComponent = getAchievementIcon(ach.icon);
                    return (
                      <motion.div
                        key={ach.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-500/50 transition-all duration-300"
                      >
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                        {/* Edit/Delete buttons */}
                        {(currentUser?.role === "admin" ||
                          currentUser?.role === "manager" ||
                          currentUser?.role === "ADMIN" ||
                          currentUser?.role === "MANAGER" ||
                          currentUser?.id === ach.created_by) && (
                          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingAchievementId(ach.id);
                                setNewAchievement({
                                  title: ach.title,
                                  description: ach.description,
                                  icon: ach.icon || "Trophy",
                                  awarded_to: ach.awarded_to || "",
                                });
                                setIsEditAchievementModalOpen(true);
                              }}
                              className="text-gray-500 dark:text-[#888] hover:text-yellow-500 transition-colors p-1.5 bg-gray-200 dark:bg-[#333] rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAchievement(ach.id)}
                              className="text-gray-500 dark:text-[#888] hover:text-red-500 transition-colors p-1.5 bg-gray-200 dark:bg-[#333] rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Icon */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-4 border border-yellow-500/30">
                          <IconComponent className="w-7 h-7 text-yellow-500" />
                        </div>

                        {/* Content */}
                        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">{ach.title}</h3>
                        <p className="text-[#AAA] text-sm leading-relaxed mb-4">{ach.description}</p>

                        {/* Awarded to */}
                        {ach.awarded_to_name && (
                          <div className="flex items-center bg-gray-200 dark:bg-[#333] rounded-xl px-3 py-2 mb-4">
                            <img
                              src={
                                ach.awarded_to_avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(ach.awarded_to_name)}&background=FF6B00&color=fff`
                              }
                              alt={ach.awarded_to_name}
                              className="w-8 h-8 rounded-full mr-3"
                            />
                            <div>
                              <p className="text-gray-900 dark:text-white text-sm font-semibold">{ach.awarded_to_name}</p>
                              <p className="text-yellow-500 text-xs">Premiado(a)</p>
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#666] pt-3 border-t border-gray-200 dark:border-[#2E2E2E]">
                          <span>Por {ach.created_by_name || "Admin"}</span>
                          <span>
                            {new Date(ach.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab !== "dashboard" &&
            activeTab !== "avisos" &&
            activeTab !== "setores" &&
            activeTab !== "chat" &&
            activeTab !== "conquistas" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-20 flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl shadow-xl"
              >
                <div className="w-20 h-20 bg-gray-100 dark:bg-[#2A2A2A] rounded-full flex items-center justify-center mb-6">
                  {React.createElement(
                    tabs.find((t) => t.id === activeTab)?.icon || Home,
                    { className: "w-10 h-10 text-[#FF6B00]" },
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  Módulo em Desenvolvimento
                </h2>
                <p className="text-gray-500 dark:text-[#888] max-w-md">
                  O submódulo{" "}
                  <span className="font-bold text-gray-900 dark:text-white">
                    "{tabs.find((t) => t.id === activeTab)?.label}"
                  </span>{" "}
                  está sendo construído nesta fase da integração da nova
                  Intranet FocusHub.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="mt-8 px-6 py-2 border border-[#FF6B00] text-[#FF6B00] rounded-full hover:-white transition-colors font-semibold"
                >
                  Voltar ao Dashboard
                </button>
              </motion.div>
            )}
        </div>

        {/* Chat UI Overlaid or Full Screen - using absolute positioning when activeTab is chat to fill the content area */}
        {activeTab === "chat" && <DiscordChat currentUser={currentUser} />}

        {/* Modal de Criar Canal */}
        <AnimatePresence>
          {isChannelModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C1C1C] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-[#2E2E2E] overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-[#2E2E2E]">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Building className="w-6 h-6 mr-3 text-[#FF6B00]" />
                    Novo Canal
                  </h2>
                  <button
                    onClick={() => setIsChannelModalOpen(false)}
                    className="text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form
                  onSubmit={handleCreateChannel}
                  className="p-6 overflow-y-auto custom-scrollbar flex-1"
                >
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Nome do Canal
                      </label>
                      <input
                        type="text"
                        value={newChannel.name}
                        onChange={(e) =>
                          setNewChannel({ ...newChannel, name: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="Ex: Grupo de Vendas"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={newChannel.description}
                        onChange={(e) =>
                          setNewChannel({
                            ...newChannel,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors resize-none h-24"
                        placeholder="Descrição curta do propósito deste canal..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Plataforma
                      </label>
                      <select
                        value={newChannel.type}
                        onChange={(e) =>
                          setNewChannel({ ...newChannel, type: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors appearance-none"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Discord">Discord</option>
                        <option value="Slack">Slack</option>
                        <option value="Teams">Microsoft Teams</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Link do Grupo (URL)
                      </label>
                      <input
                        type="url"
                        value={newChannel.url}
                        onChange={(e) =>
                          setNewChannel({ ...newChannel, url: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="https://chat.whatsapp.com/..."
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsChannelModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl font-bold text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-[#333] transition-colors mr-3"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingChannel}
                      className="-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center shadow-lg"
                    >
                      {isCreatingChannel ? "Criando..." : "Criar Canal"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Criar Contato */}
        <AnimatePresence>
          {isContactModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C1C1C] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-[#2E2E2E] overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-[#2E2E2E]">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-6 h-6 mr-3 text-[#FF6B00]" />
                    Novo Contato
                  </h2>
                  <button
                    onClick={() => setIsContactModalOpen(false)}
                    className="text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form
                  onSubmit={handleCreateContact}
                  className="p-6 overflow-y-auto custom-scrollbar flex-1"
                >
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="Nome completo..."
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                          Cargo
                        </label>
                        <input
                          type="text"
                          value={newContact.job_title}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              job_title: e.target.value,
                            })
                          }
                          className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                          placeholder="Ex: Designer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                          Setor
                        </label>
                        <input
                          type="text"
                          value={newContact.sector}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              sector: e.target.value,
                            })
                          }
                          className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                          placeholder="Ex: Marketing"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Nível
                      </label>
                      <select
                        value={newContact.role}
                        onChange={(e) =>
                          setNewContact({ ...newContact, role: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors appearance-none"
                      >
                        <option value="user">Colaborador</option>
                        <option value="manager">Gestor / Diretoria</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        WhatsApp (com DDD)
                      </label>
                      <input
                        type="text"
                        value={newContact.whatsapp}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            whatsapp: e.target.value,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="Ex: 11999999999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        value={newContact.birth_date || ""}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            birth_date: e.target.value,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Foto (Avatar)
                      </label>
                      <div className="flex items-center space-x-4">
                        {newContact.avatar_url && (
                          <img src={newContact.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={isUploadingAvatar}
                          className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:-white hover:file:bg-[#e66000]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl font-bold text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-[#333] transition-colors mr-3"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingContact}
                      className="-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center shadow-lg"
                    >
                      {isCreatingContact ? "Criando..." : "Adicionar Contato"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Editar Contato */}
        <AnimatePresence>
          {isEditContactModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C1C1C] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-[#2E2E2E] overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-[#2E2E2E]">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-6 h-6 mr-3 text-[#FF6B00]" />
                    Editar Contato
                  </h2>
                  <button
                    onClick={() => {
                      setIsEditContactModalOpen(false);
                      setEditingContactId(null);
                      setNewContact({
                        name: "",
                        job_title: "",
                        sector: "",
                        role: "user",
                        whatsapp: "",
                        email: "",
                        birth_date: "", avatar_url: "",
                      });
                    }}
                    className="text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form
                  onSubmit={handleEditContact}
                  className="p-6 overflow-y-auto custom-scrollbar flex-1"
                >
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="Nome completo..."
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                          Cargo
                        </label>
                        <input
                          type="text"
                          value={newContact.job_title}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              job_title: e.target.value,
                            })
                          }
                          className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                          placeholder="Ex: Designer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                          Setor
                        </label>
                        <input
                          type="text"
                          value={newContact.sector}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              sector: e.target.value,
                            })
                          }
                          className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                          placeholder="Ex: Marketing"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Nível
                      </label>
                      <select
                        value={newContact.role}
                        onChange={(e) =>
                          setNewContact({ ...newContact, role: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors appearance-none"
                      >
                        <option value="user">Colaborador</option>
                        <option value="manager">Gestor / Diretoria</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        WhatsApp (com DDD)
                      </label>
                      <input
                        type="text"
                        value={newContact.whatsapp}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            whatsapp: e.target.value,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="Ex: 11999999999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            email: e.target.value,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                        placeholder="Ex: joao@focus.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        value={newContact.birth_date || ""}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            birth_date: e.target.value,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-[#888] mb-2">
                        Foto (Avatar)
                      </label>
                      <div className="flex items-center space-x-4">
                        {newContact.avatar_url && (
                          <img src={newContact.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={isUploadingAvatar}
                          className="w-full bg-gray-100 dark:bg-[#2A2A2A] text-white border border-gray-300 dark:border-[#3E3E3E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:-white hover:file:bg-[#e66000]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditContactModalOpen(false);
                        setEditingContactId(null);
                        setNewContact({
                          name: "",
                          job_title: "",
                          sector: "",
                          role: "user",
                          whatsapp: "",
                          email: "",
                          birth_date: "", avatar_url: "",
                        });
                      }}
                      className="px-6 py-2.5 rounded-xl font-bold text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-[#333] transition-colors mr-3"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingContact}
                      className="-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center shadow-lg"
                    >
                      {isCreatingContact ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Editar Aviso */}
        <AnimatePresence>
          {isEditAnnouncementModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C1C1C] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-[#2E2E2E]"
              >
                <div className="p-6 border-b border-gray-200 dark:border-[#2E2E2E] flex justify-between items-center bg-gray-100 dark:bg-[#2A2A2A]">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Megaphone className="w-6 h-6 mr-3 text-[#FF6B00]" />
                    Editar Aviso
                  </h2>
                  <button
                    onClick={() => {
                      setIsEditAnnouncementModalOpen(false);
                      setEditingAnnouncementId(null);
                      setEditPost({ title: "", content: "", priority: "Normal" });
                    }}
                    className="text-gray-500 dark:text-[#B3B3B3] hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleEditAnnouncement} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Título do Aviso
                      </label>
                      <input
                        type="text"
                        value={editPost.title}
                        onChange={(e) =>
                          setEditPost({ ...editPost, title: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#FF6B00] transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Conteúdo
                      </label>
                      <textarea
                        value={editPost.content}
                        onChange={(e) =>
                          setEditPost({ ...editPost, content: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#FF6B00] transition-colors h-32 resize-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Prioridade
                      </label>
                      <select
                        value={editPost.priority}
                        onChange={(e) =>
                          setEditPost({
                            ...editPost,
                            priority: e.target.value as any,
                          })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#FF6B00] transition-colors"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Importante">Importante</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditAnnouncementModalOpen(false);
                        setEditingAnnouncementId(null);
                        setEditPost({ title: "", content: "", priority: "Normal" });
                      }}
                      className="px-6 py-2 rounded-lg font-bold text-gray-300 hover:text-gray-900 dark:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="-white px-6 py-2 rounded-lg font-bold transition-colors"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Criar Conquista */}
        <AnimatePresence>
          {isAchievementModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C1C1C] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-[#2E2E2E]"
              >
                <div className="p-6 border-b border-gray-200 dark:border-[#2E2E2E] flex justify-between items-center bg-gray-100 dark:bg-[#2A2A2A]">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Trophy className="w-6 h-6 mr-3 text-yellow-500" />
                    Nova Conquista
                  </h2>
                  <button
                    onClick={() => {
                      setIsAchievementModalOpen(false);
                      setNewAchievement({ title: "", description: "", icon: "Trophy", awarded_to: "" });
                    }}
                    className="text-gray-500 dark:text-[#B3B3B3] hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleCreateAchievement} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Título da Conquista
                      </label>
                      <input
                        type="text"
                        value={newAchievement.title}
                        onChange={(e) =>
                          setNewAchievement({ ...newAchievement, title: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        placeholder="Ex: Funcionário do Mês"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={newAchievement.description}
                        onChange={(e) =>
                          setNewAchievement({ ...newAchievement, description: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors h-24 resize-none"
                        placeholder="Descreva a conquista..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ícone
                      </label>
                      <div className="flex space-x-3">
                        {[
                          { name: "Trophy", icon: Trophy },
                          { name: "Award", icon: Award },
                          { name: "Star", icon: Star },
                          { name: "Medal", icon: Medal },
                          { name: "Target", icon: Target },
                          { name: "Zap", icon: Zap },
                          { name: "CheckCircle2", icon: CheckCircle2 },
                          { name: "Heart", icon: Heart },
                        ].map(({ name, icon: Icon }) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() =>
                              setNewAchievement({ ...newAchievement, icon: name })
                            }
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              newAchievement.icon === name
                                ? "bg-yellow-500 text-white"
                                : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-[#888] hover:bg-[#333]"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Premiar Colaborador (Opcional)
                      </label>
                      <select
                        value={newAchievement.awarded_to}
                        onChange={(e) =>
                          setNewAchievement({ ...newAchievement, awarded_to: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                      >
                        <option value="">Nenhum (conquista geral)</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - {c.job_title || c.sector || ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAchievementModalOpen(false);
                        setNewAchievement({ title: "", description: "", icon: "Trophy", awarded_to: "" });
                      }}
                      className="px-6 py-2 rounded-lg font-bold text-gray-300 hover:text-gray-900 dark:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingAchievement}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 dark:text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                      {isCreatingAchievement ? "Criando..." : "Criar Conquista"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Editar Conquista */}
        <AnimatePresence>
          {isEditAchievementModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C1C1C] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-[#2E2E2E]"
              >
                <div className="p-6 border-b border-gray-200 dark:border-[#2E2E2E] flex justify-between items-center bg-gray-100 dark:bg-[#2A2A2A]">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Trophy className="w-6 h-6 mr-3 text-yellow-500" />
                    Editar Conquista
                  </h2>
                  <button
                    onClick={() => {
                      setIsEditAchievementModalOpen(false);
                      setEditingAchievementId(null);
                      setNewAchievement({ title: "", description: "", icon: "Trophy", awarded_to: "" });
                    }}
                    className="text-gray-500 dark:text-[#B3B3B3] hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleEditAchievement} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Título da Conquista
                      </label>
                      <input
                        type="text"
                        value={newAchievement.title}
                        onChange={(e) =>
                          setNewAchievement({ ...newAchievement, title: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={newAchievement.description}
                        onChange={(e) =>
                          setNewAchievement({ ...newAchievement, description: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors h-24 resize-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ícone
                      </label>
                      <div className="flex space-x-3">
                        {[
                          { name: "Trophy", icon: Trophy },
                          { name: "Award", icon: Award },
                          { name: "Star", icon: Star },
                          { name: "Medal", icon: Medal },
                          { name: "Target", icon: Target },
                          { name: "Zap", icon: Zap },
                          { name: "CheckCircle2", icon: CheckCircle2 },
                          { name: "Heart", icon: Heart },
                        ].map(({ name, icon: Icon }) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() =>
                              setNewAchievement({ ...newAchievement, icon: name })
                            }
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              newAchievement.icon === name
                                ? "bg-yellow-500 text-white"
                                : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-[#888] hover:bg-[#333]"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Premiar Colaborador (Opcional)
                      </label>
                      <select
                        value={newAchievement.awarded_to}
                        onChange={(e) =>
                          setNewAchievement({ ...newAchievement, awarded_to: e.target.value })
                        }
                        className="w-full bg-gray-100 dark:bg-[#2A2A2A] border border-gray-300 dark:border-[#444] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                      >
                        <option value="">Nenhum (conquista geral)</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - {c.job_title || c.sector || ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditAchievementModalOpen(false);
                        setEditingAchievementId(null);
                        setNewAchievement({ title: "", description: "", icon: "Trophy", awarded_to: "" });
                      }}
                      className="px-6 py-2 rounded-lg font-bold text-gray-300 hover:text-gray-900 dark:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 dark:text-white px-6 py-2 rounded-lg font-bold transition-all"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MuralScreen;
