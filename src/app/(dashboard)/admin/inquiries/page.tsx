'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  MessageSquare, 
  CalendarCheck, 
  Search, 
  Filter,
  MoreVertical,
  Loader2,
  AlertCircle,
  TrendingUp,
  Mail,
  MapPin,
  User
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

// --- 型定義 ---
type LeadStatus = '新規' | 'ヒアリング中' | '体験予約済' | '成約（入会）' | '失注';

interface Lead {
  id: string;
  created_at: string;
  name: string;
  age_group: string;
  area: string;
  concern: string;
  status: LeadStatus;
  line_user_id: string;
}

// --- ステータス設定 ---
const STATUS_OPTIONS: LeadStatus[] = ['新規', 'ヒアリング中', '体験予約済', '成約（入会）', '失注'];

const STATUS_STYLES: Record<LeadStatus, { variant: "default" | "secondary" | "destructive" | "outline", className: string, dot: string }> = {
  '新規': { variant: 'destructive', className: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  'ヒアリング中': { variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  '体験予約済': { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  '成約（入会）': { variant: 'default', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  '失注': { variant: 'outline', className: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
};

export default function AdminInquiryListPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // データ取得
  const fetchLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err: any) {
      console.error('Error fetching leads:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // ステータス更新
  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    try {
      setUpdatingId(id)
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // ローカルステートを即時更新
      setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead))
    } catch (err: any) {
      console.error('Error updating status:', err)
      alert(`更新に失敗しました: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  // KPI計算
  const now = new Date()
  const leadsThisMonth = leads.filter(l => {
    const d = new Date(l.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  
  const pendingLeads = leads.filter(l => l.status === '新規').length
  const confirmedLeads = leads.filter(l => l.status === '体験予約済').length

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.concern.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && leads.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-600" />
          <p className="mt-4 text-slate-500 font-medium">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* ページタイトルエリア */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200">
              <TrendingUp className="text-white h-6 w-6" />
            </div>
            リード管理
          </h1>
          <p className="text-slate-500 mt-1 font-medium">LINE経由の問い合わせ・リードをリアルタイムに管理します</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="リードを検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm w-full md:w-72 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all shadow-sm"
            />
          </div>
          <button onClick={fetchLeads} className="p-2.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm text-slate-600">
            <Loader2 className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIエリア */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          label="今月の新規リード" 
          value={leadsThisMonth} 
          icon={<Users className="text-cyan-600" />} 
          trend="+12%" 
          color="cyan"
        />
        <KPICard 
          label="未対応（要返信）" 
          value={pendingLeads} 
          icon={<MessageSquare className="text-rose-600" />} 
          trend="緊急" 
          color="rose"
        />
        <KPICard 
          label="体験確定" 
          value={confirmedLeads} 
          icon={<CalendarCheck className="text-emerald-600" />} 
          trend="順調" 
          color="emerald"
        />
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 shadow-sm">
          <AlertCircle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* リード一覧テーブル */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40">
        <CardHeader className="px-8 py-6 border-b border-slate-100 bg-white/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <User className="h-5 w-5 text-cyan-600" />
              リードリスト
            </CardTitle>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1">
              全 {filteredLeads.length} 件
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="px-8 py-4 font-bold text-slate-500 text-xs uppercase tracking-widest">登録日</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-widest">お名前</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-widest">対象者 / エリア</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-widest">お悩み内容</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-widest">ステータス</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-slate-500 text-xs uppercase tracking-widest text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="border-b border-slate-50 hover:bg-cyan-50/30 transition-colors group">
                    <TableCell className="px-8 py-5 text-sm text-slate-400 font-medium whitespace-nowrap">
                      {format(new Date(lead.created_at), 'yyyy/MM/dd', { locale: ja })}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-black shadow-md shadow-cyan-100 ring-2 ring-white">
                          {lead.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-base">{lead.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{lead.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-700 text-sm font-semibold">
                          <User size={14} className="text-cyan-500" />
                          {lead.age_group}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <MapPin size={12} />
                          {lead.area}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <p className="text-sm text-slate-600 line-clamp-2 max-w-xs leading-relaxed italic">
                        {lead.concern ? `"${lead.concern}"` : '-'}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <Select
                        disabled={updatingId === lead.id}
                        value={lead.status}
                        onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}
                      >
                        <SelectTrigger className={`w-40 h-9 rounded-full border-2 font-bold text-xs transition-all ${STATUS_STYLES[lead.status].className}`}>
                          <div className="flex items-center gap-2">
                            {updatingId === lead.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <div className={`h-2 w-2 rounded-full ${STATUS_STYLES[lead.status].dot} animate-pulse`} />
                            )}
                            <SelectValue placeholder="ステータス" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-xl overflow-hidden">
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt} className="text-xs font-bold py-2 focus:bg-cyan-50 focus:text-cyan-700 transition-colors cursor-pointer">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${STATUS_STYLES[opt as LeadStatus].dot}`} />
                                {opt}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-right">
                      <button className="p-2 text-slate-300 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all">
                        <MoreVertical size={20} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredLeads.length === 0 && (
            <div className="py-20 text-center">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-medium">該当するリードが見つかりません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- サブコンポーネント: KPIカード ---
function KPICard({ label, value, icon, trend, color }: { 
  label: string; value: number | string; icon: React.ReactNode; trend: string; color: 'cyan' | 'rose' | 'emerald' 
}) {
  const colorStyles = {
    cyan: 'from-cyan-50/50 to-white border-cyan-100 shadow-cyan-100/20',
    rose: 'from-rose-50/50 to-white border-rose-100 shadow-rose-100/20',
    emerald: 'from-emerald-50/50 to-white border-emerald-100 shadow-emerald-100/20',
  }

  const iconBg = {
    cyan: 'bg-cyan-100 ring-cyan-50 text-cyan-600',
    rose: 'bg-rose-100 ring-rose-50 text-rose-600',
    emerald: 'bg-emerald-100 ring-emerald-50 text-emerald-600',
  }

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} p-6 rounded-3xl border shadow-xl transition-all hover:scale-[1.02] duration-300 group`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl shadow-sm ring-4 transition-all group-hover:rotate-6 ${iconBg[color]}`}>
          {icon}
        </div>
        <Badge variant={color === 'rose' ? 'destructive' : 'secondary'} className={`text-[10px] font-black px-2.5 py-1 rounded-full tracking-tighter uppercase shadow-sm`}>
          {trend}
        </Badge>
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-800 tracking-tighter">{value}</span>
          <span className="text-slate-300 text-xs font-bold uppercase">Records</span>
        </div>
      </div>
    </div>
  )
}
