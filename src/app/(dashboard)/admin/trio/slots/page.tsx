'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { getTrioSlots } from '@/actions/trio_matching';
import { createTrioSlot, deleteTrioSlot, toggleFacilityBooked } from '@/actions/trio_admin';
import { TrioSlot } from '@/types/trio';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function AdminTrioSlotsPage() {
  const [slots, setSlots] = useState<TrioSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const fetchSlots = async () => {
    const { slots: data } = await getTrioSlots();
    if (data) setSlots(data);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;

    setLoading(true);
    const startAt = new Date(`${date}T${startTime}:00+09:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00+09:00`).toISOString();

    const res = await createTrioSlot(startAt, endAt);
    if (res.success) {
      alert('スロットを作成しました');
      setDate('');
      setStartTime('');
      setEndTime('');
      fetchSlots();
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('本当にこのスロットを削除しますか？')) return;
    setLoading(true);
    const res = await deleteTrioSlot(id);
    if (res.success) fetchSlots();
    else alert(res.error);
    setLoading(false);
  };

  const handleToggleBooked = async (id: string, current: boolean) => {
    setLoading(true);
    const res = await toggleFacilityBooked(id, !current);
    if (res.success) fetchSlots();
    else alert(res.error);
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">THE TRIO: スロット管理</h1>

      <div className="bg-card shadow rounded-lg p-6 mb-8 border">
        <h2 className="text-lg font-semibold mb-4">新規スロット作成</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">日付</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">開始時間</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">終了時間</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>追加</Button>
        </form>
      </div>

      <div className="bg-card shadow rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>予約人数</TableHead>
              <TableHead>施設予約</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map(slot => (
              <TableRow key={slot.id}>
                <TableCell>
                  {format(new Date(slot.start_at), 'yyyy/MM/dd (E) HH:mm', { locale: ja })} ~{' '}
                  {format(new Date(slot.end_at), 'HH:mm')}
                </TableCell>
                <TableCell>
                  {slot.status === 'entry' && <span className="text-blue-500">受付中</span>}
                  {slot.status === 'matching' && <span className="text-orange-500">マッチング中</span>}
                  {slot.status === 'confirmed' && <span className="text-green-500 font-bold">開催確定</span>}
                  {slot.status === 'closed' && <span className="text-gray-500">終了/不成立</span>}
                </TableCell>
                <TableCell>{slot.reserved_count} / 3</TableCell>
                <TableCell>
                  <Button 
                    variant={slot.is_facility_booked ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleBooked(slot.id, slot.is_facility_booked)}
                    disabled={loading}
                    className={slot.is_facility_booked ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {slot.is_facility_booked ? '予約済' : '未予約'}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(slot.id)} disabled={loading}>
                    削除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {slots.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  スロットが存在しません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
