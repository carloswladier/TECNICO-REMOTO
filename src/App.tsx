/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  UserX, 
  MapPin, 
  Calendar, 
  FileText, 
  Hash, 
  AlertCircle, 
  X,
  Trash2,
  ChevronDown,
  Lock,
  User,
  Users,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { supabase, isSupabaseConfigured } from './supabase';

// Types
type Status = 'RESOLVIDO' | 'MANTER' | 'SEM CONTATO';
type TipoOS = 'VT VIRTUA' | 'VT DIGITAL' | 'VT VOIP' | 'VT MESH' | 'VT NOW' | 'VT WIFI 360' | 'VT STREAMING';
type UserRole = 'ADMIN' | 'EDITOR';

interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

interface ServiceOrder {
  id: string;
  tecnico: string;
  cidade: string;
  data: string;
  contrato: string;
  status: Status;
  tipo_os: TipoOS;
  reclamacao: string;
  codigo_cancelamento: string;
  node: string;
  observacao: string;
  created_at: number;
  created_by: string;
}

const STATUS_OPTIONS: Status[] = ['RESOLVIDO', 'MANTER', 'SEM CONTATO'];
const TIPO_OS_OPTIONS: TipoOS[] = [
  'VT VIRTUA', 
  'VT DIGITAL', 
  'VT VOIP', 
  'VT MESH', 
  'VT NOW', 
  'VT WIFI 360', 
  'VT STREAMING'
];

const CIDADE_OPTIONS = [
  'ANANINDEUA', 
  'BELÉM', 
  'CASTANHAL', 
  'CAXIAS', 
  'IMPERATRIZ', 
  'MACAPÁ', 
  'MANAUS', 
  'MARABÁ', 
  'PARAGOMINAS', 
  'PARAUAPEBAS', 
  'SANTANA', 
  'SÃO LUÍS', 
  'TIMON'
];

const TECHNICIAN_MAPPING: Record<string, string> = {
  'N5949445': 'ALAN SANTOS',
  'N6011570': 'WYBSON FERREIRA',
  'N0184040': 'ERIC PACHECO',
  'N5539604': 'PAULO CADAIS',
  'F274721': 'ADYEL SANTOS',
  'F274667': 'BRUNO SOUZA',
  'F274716': 'ELIVELTON PINHEIRO'
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'USERS'>('ORDERS');
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [systemUsers, setSystemUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'TODOS'>('TODOS');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('TODOS');
  const [filterCity, setFilterCity] = useState('TODOS');
  const [isLoading, setIsLoading] = useState(true);
  const [isOtherCity, setIsOtherCity] = useState(false);

  // User Form State
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    role: 'EDITOR' as UserRole
  });

  // Form State
  const [formData, setFormData] = useState<Partial<ServiceOrder>>({
    status: 'RESOLVIDO',
    tipo_os: 'VT VIRTUA',
    data: new Date().toISOString().split('T')[0]
  });

  // Load data from Supabase
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
      if (currentUser?.role === 'ADMIN') {
        fetchUsers();
      }
    }
  }, [isLoggedIn]);

  // Auto-populate technician name based on login
  useEffect(() => {
    if (isModalOpen && currentUser) {
      const techName = TECHNICIAN_MAPPING[currentUser.username];
      if (techName) {
        setFormData(prev => ({ ...prev, tecnico: techName }));
      }
    }
  }, [isModalOpen, currentUser]);

  async function fetchOrders() {
    setIsLoading(true);
    try {
      let query = supabase
        .from('service_orders')
        .select('*');

      // Regra de Visibilidade: Se não for ADMIN, filtra pelo próprio usuário
      if (currentUser?.role !== 'ADMIN') {
        query = query.eq('created_by', currentUser?.username);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, role, created_at');
      if (error) throw error;
      if (data) setSystemUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!isSupabaseConfigured) {
      setLoginError('Supabase não configurado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }

    try {
      // Verificar se a tabela existe e se há usuários
      const { count, error: countError } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        setLoginError(`Erro ao acessar banco de dados: ${countError.message}. Verifique se a tabela 'app_users' foi criada.`);
        return;
      }

      if (count === 0) {
        setLoginError('Nenhum usuário cadastrado. Você precisa criar o primeiro usuário diretamente no painel do Supabase.');
        return;
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', loginUsername)
        .eq('password', loginPassword)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setLoginError('Usuário ou senha inválidos');
        } else {
          setLoginError(`Erro Supabase: ${error.message}`);
        }
        return;
      }

      if (!data) {
        setLoginError('Usuário ou senha inválidos');
        return;
      }

      setCurrentUser(data);
      setIsLoggedIn(true);
    } catch (error: any) {
      setLoginError(`Erro de conexão: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('app_users')
        .insert([userFormData])
        .select();

      if (error) throw error;
      if (data) {
        setSystemUsers([...systemUsers, data[0]]);
        setIsUserModalOpen(false);
        setUserFormData({ username: '', password: '', role: 'EDITOR' });
      }
    } catch (error) {
      alert('Erro ao cadastrar usuário');
    }
  };

  const deleteUser = async (id: string) => {
    if (id === currentUser?.id) return alert('Você não pode excluir a si mesmo');
    if (window.confirm('Excluir este usuário?')) {
      try {
        const { error } = await supabase.from('app_users').delete().eq('id', id);
        if (error) throw error;
        setSystemUsers(systemUsers.filter(u => u.id !== id));
      } catch (error) {
        alert('Erro ao excluir usuário');
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsOtherCity(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setIsOtherCity(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newOrder: Omit<ServiceOrder, 'id'> = {
      tecnico: formData.tecnico!,
      cidade: formData.cidade!,
      data: formData.data!,
      contrato: formData.contrato!,
      status: formData.status!,
      tipo_os: formData.tipo_os!,
      reclamacao: formData.reclamacao || '',
      codigo_cancelamento: formData.codigo_cancelamento || '',
      node: formData.node || '',
      observacao: formData.observacao || '',
      created_at: Date.now(),
      created_by: currentUser?.username || 'admin'
    };

    try {
      const { data, error } = await supabase
        .from('service_orders')
        .insert([newOrder])
        .select();

      if (error) throw error;
      if (data) {
        setOrders([data[0], ...orders]);
        setIsModalOpen(false);
        setIsOtherCity(false);
        setFormData({
          status: 'RESOLVIDO',
          tipo_os: 'VT VIRTUA',
          data: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erro ao salvar no Supabase. Verifique a conexão e as variáveis de ambiente.');
    }
  };

  const deleteOrder = async (id: string) => {
    if (window.confirm('Deseja realmente excluir este registro?')) {
      try {
        const { error } = await supabase
          .from('service_orders')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setOrders(orders.filter(o => o.id !== id));
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Erro ao excluir do Supabase.');
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cidade.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'TODOS' || order.status === filterStatus;
    const matchesTechnician = filterTechnician === 'TODOS' || order.tecnico === filterTechnician;
    const matchesCity = filterCity === 'TODOS' || order.cidade === filterCity;
    
    let matchesDate = true;
    if (filterDateStart) {
      matchesDate = matchesDate && order.data >= filterDateStart;
    }
    if (filterDateEnd) {
      matchesDate = matchesDate && order.data <= filterDateEnd;
    }
    
    return matchesSearch && matchesStatus && matchesTechnician && matchesCity && matchesDate;
  });

  const uniqueTechnicians = Array.from(new Set(orders.map(o => o.tecnico))).sort();
  const uniqueCities = Array.from(new Set(orders.map(o => o.cidade))).sort();

  // Chart Data Preparation
  const statusData = STATUS_OPTIONS.map(status => ({
    name: status,
    value: filteredOrders.filter(o => o.status === status).length
  }));

  const techData = uniqueTechnicians.map(tech => {
    const techOrders = filteredOrders.filter(o => o.tecnico === tech);
    return {
      name: tech,
      RESOLVIDO: techOrders.filter(o => o.status === 'RESOLVIDO').length,
      MANTER: techOrders.filter(o => o.status === 'MANTER').length,
      'SEM CONTATO': techOrders.filter(o => o.status === 'SEM CONTATO').length,
    };
  }).filter(t => (t.RESOLVIDO + t.MANTER + t['SEM CONTATO']) > 0);

  const cityData = uniqueCities.map(city => {
    const cityOrders = filteredOrders.filter(o => o.cidade === city);
    return {
      name: city,
      RESOLVIDO: cityOrders.filter(o => o.status === 'RESOLVIDO').length,
      MANTER: cityOrders.filter(o => o.status === 'MANTER').length,
      'SEM CONTATO': cityOrders.filter(o => o.status === 'SEM CONTATO').length,
    };
  }).filter(c => (c.RESOLVIDO + c.MANTER + c['SEM CONTATO']) > 0);

  const COLORS = {
    RESOLVIDO: '#10b981',
    MANTER: '#f59e0b',
    'SEM CONTATO': '#f43f5e'
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'RESOLVIDO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'MANTER': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'SEM CONTATO': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'RESOLVIDO': return <CheckCircle2 size={14} />;
      case 'MANTER': return <Clock size={14} />;
      case 'SEM CONTATO': return <UserX size={14} />;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-red-600 p-4 rounded-2xl text-white mb-4 shadow-lg shadow-red-200">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
            <p className="text-slate-500 text-sm">Controle Técnico Remoto</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Usuário</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="admin"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="password"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-rose-100"
              >
                <AlertCircle size={16} />
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
            >
              Entrar no Sistema
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 p-2 rounded-lg text-white">
                <FileText size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Controle Remoto</h1>
            </div>
            
            <nav className="flex gap-1">
              <button 
                onClick={() => setActiveTab('ORDERS')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'ORDERS' ? 'bg-slate-100 text-red-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <FileText size={16} /> Ordens
              </button>
              {currentUser?.role === 'ADMIN' && (
                <button 
                  onClick={() => setActiveTab('USERS')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'USERS' ? 'bg-slate-100 text-red-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Users size={16} /> Usuários
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">{currentUser?.username}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.role}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            {activeTab === 'ORDERS' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm shadow-red-200 active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nova Ordem</span>
              </button>
            )}
            {activeTab === 'USERS' && (
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo Usuário</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'ORDERS' ? (
          <>
            {/* Stats & Charts Section */}
            {currentUser?.role === 'ADMIN' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                    <p className="text-2xl font-bold">{filteredOrders.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Resolvido</p>
                    <p className="text-2xl font-bold">{filteredOrders.filter(o => o.status === 'RESOLVIDO').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Manter</p>
                    <p className="text-2xl font-bold">{filteredOrders.filter(o => o.status === 'MANTER').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Sem Contato</p>
                    <p className="text-2xl font-bold">{filteredOrders.filter(o => o.status === 'SEM CONTATO').length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                  {/* Status Pie Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] lg:col-span-4 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <div className="w-1 h-4 bg-red-600 rounded-full" />
                      Volume por Status
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Technician Bar Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] lg:col-span-8 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <div className="w-1 h-4 bg-red-600 rounded-full" />
                      Desempenho por Técnico
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={techData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            angle={-15}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                          <Bar dataKey="RESOLVIDO" stackId="a" fill={COLORS.RESOLVIDO} radius={[0, 0, 0, 0]} barSize={32} />
                          <Bar dataKey="MANTER" stackId="a" fill={COLORS.MANTER} radius={[0, 0, 0, 0]} barSize={32} />
                          <Bar dataKey="SEM CONTATO" stackId="a" fill={COLORS['SEM CONTATO']} radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* City Bar Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] lg:col-span-12 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <div className="w-1 h-4 bg-red-600 rounded-full" />
                      Volume por Cidade
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityData} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            angle={-25}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                          <Bar dataKey="RESOLVIDO" stackId="a" fill={COLORS.RESOLVIDO} barSize={40} />
                          <Bar dataKey="MANTER" stackId="a" fill={COLORS.MANTER} barSize={40} />
                          <Bar dataKey="SEM CONTATO" stackId="a" fill={COLORS['SEM CONTATO']} radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
              <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser?.role === 'ADMIN' ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-4`}>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Contrato..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Date Range */}
                <div className="flex gap-2 lg:col-span-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Technician Filter */}
                {currentUser?.role === 'ADMIN' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none transition-all cursor-pointer bg-white"
                      value={filterTechnician}
                      onChange={(e) => setFilterTechnician(e.target.value)}
                    >
                      <option value="TODOS">Técnicos</option>
                      {uniqueTechnicians.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                )}

                {/* City Filter */}
                {currentUser?.role === 'ADMIN' && (
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none transition-all cursor-pointer bg-white"
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                    >
                      <option value="TODOS">Cidades</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                )}

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none transition-all cursor-pointer bg-white"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                  >
                    <option value="TODOS">Status</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Técnico</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cidade</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de OS</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                              <p>Carregando dados do Supabase...</p>
                            </div>
                          </td>
                        </tr>
                      ) : filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                          <motion.tr
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={order.id}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{order.tecnico}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-500 flex items-center gap-1">
                                <MapPin size={12} /> {order.cidade}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-900 font-medium">#{order.contrato}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {order.data}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                {order.tipo_os}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 inline-block">
                                {order.node}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => deleteOrder(order.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle size={32} className="text-slate-300" />
                              <p>Nenhuma ordem de serviço encontrada.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Gerenciamento de Usuários</h2>
              <p className="text-sm text-slate-500">Cadastre e gerencie quem pode acessar o sistema.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado em</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {systemUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                            <User size={16} />
                          </div>
                          <span className="font-semibold text-slate-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${user.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          disabled={user.id === currentUser?.id}
                          onClick={() => deleteUser(user.id)}
                          className={`p-2 rounded-lg transition-all ${user.id === currentUser?.id ? 'text-slate-200' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100'}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Cadastrar Usuário</h2>
                <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Login</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: tecnico_joao"
                    value={userFormData.username}
                    onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Senha</label>
                  <input
                    required
                    type="password"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="••••••••"
                    value={userFormData.password}
                    onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Perfil</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all bg-white"
                    value={userFormData.role}
                    onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}
                  >
                    <option value="EDITOR">Editor (Gravação/Edição)</option>
                    <option value="ADMIN">Administrador (Total)</option>
                  </select>
                </div>

                <div className="mt-8 flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-lg active:scale-95 transition-all"
                  >
                    Salvar Usuário
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Nova Ordem de Serviço</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Técnico */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Técnico</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Nome do técnico"
                      value={formData.tecnico || ''}
                      onChange={e => setFormData({...formData, tecnico: e.target.value})}
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Cidade</label>
                    <div className="space-y-2">
                      <select
                        required
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all bg-white"
                        value={isOtherCity ? 'OUTRA' : (CIDADE_OPTIONS.includes(formData.cidade || '') ? formData.cidade : (formData.cidade ? 'OUTRA' : ''))}
                        onChange={e => {
                          if (e.target.value === 'OUTRA') {
                            setIsOtherCity(true);
                            setFormData({...formData, cidade: ''});
                          } else {
                            setIsOtherCity(false);
                            setFormData({...formData, cidade: e.target.value});
                          }
                        }}
                      >
                        <option value="" disabled>Selecione a cidade</option>
                        {CIDADE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="OUTRA">OUTRA (Digitar manualmente)</option>
                      </select>
                      
                      {isOtherCity && (
                        <input
                          required
                          type="text"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                          placeholder="Digite o nome da cidade"
                          value={formData.cidade || ''}
                          onChange={e => setFormData({...formData, cidade: e.target.value.toUpperCase()})}
                        />
                      )}
                    </div>
                  </div>

                  {/* Data */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Data</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      value={formData.data || ''}
                      onChange={e => setFormData({...formData, data: e.target.value})}
                    />
                  </div>

                  {/* Contrato */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Contrato</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Número do contrato"
                      value={formData.contrato || ''}
                      onChange={e => setFormData({...formData, contrato: e.target.value})}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Status</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all bg-white"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as Status})}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Tipo de OS */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Tipo de OS</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all bg-white"
                      value={formData.tipo_os}
                      onChange={e => setFormData({...formData, tipo_os: e.target.value as TipoOS})}
                    >
                      {TIPO_OS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Node */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Node</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Identificação do Node"
                      value={formData.node || ''}
                      onChange={e => setFormData({...formData, node: e.target.value})}
                    />
                  </div>

                  {/* Código de Cancelamento */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Cód. Cancelamento</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Se houver"
                      value={formData.codigo_cancelamento || ''}
                      onChange={e => setFormData({...formData, codigo_cancelamento: e.target.value})}
                    />
                  </div>
                </div>

                {/* Reclamação e Observação lado a lado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Reclamação</label>
                    <textarea
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
                      placeholder="Descrição da reclamação do cliente"
                      value={formData.reclamacao || ''}
                      onChange={e => setFormData({...formData, reclamacao: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Observação</label>
                    <textarea
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
                      placeholder="Observações técnicas adicionais"
                      value={formData.observacao || ''}
                      onChange={e => setFormData({...formData, observacao: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 active:scale-95 transition-all"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
