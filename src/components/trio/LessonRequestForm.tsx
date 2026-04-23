'use client';

import { useState } from 'react';
import { Send, Calendar, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitTrioLessonRequest } from '@/actions/trio_requests';
import { cn } from '@/lib/utils';

interface LessonRequestFormProps {
  studentId: string;
}

export default function LessonRequestForm({ studentId }: LessonRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error('会員情報の取得に失敗しました。');
      return;
    }

    setLoading(true);
    try {
      const res = await submitTrioLessonRequest({
        studentId,
        preferredDate: date,
        preferredTimeSlot: timeSlot,
        message
      });

      if (res.success) {
        setSuccess(true);
        toast.success('リクエストを送信しました！');
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50/50 backdrop-blur-xl border border-emerald-200 rounded-[3rem] p-12 text-center space-y-8 shadow-[0_20px_100px_rgba(16,185,129,0.05)]">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-sky-950 tracking-tight">リクエスト送信完了</h3>
          <p className="text-sm text-sky-600/70 font-bold leading-relaxed">
            ご希望を承りました。調整が可能な場合、<br/>管理者よりご連絡いたします。
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSuccess(false)}
          className="bg-white border-sky-100 text-sky-500 hover:bg-sky-50 rounded-xl"
        >
          別のリクエストを送る
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-sky-100 rounded-[3rem] p-8 md:p-12 relative overflow-hidden shadow-[0_30px_120px_rgba(56,189,248,0.04)]" id="request">
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-400/5 rounded-full blur-3xl -mr-32 -mt-32" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-black text-sky-950 tracking-tight">別日レッスンのリクエスト</h2>
          <p className="text-xs text-sky-400/60 font-bold tracking-wider uppercase">
             Request a different schedule
          </p>
          <div className="mt-2 p-4 bg-sky-50 rounded-2xl shadow-sm">
            <p className="text-[10px] text-sky-500 font-black leading-relaxed">
              ※2名以上が集まった時点で施設予約をいたします。開催確定時にご連絡いたします。
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-300 uppercase tracking-widest flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> 希望日
              </label>
              <Input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-sky-200 text-sky-900 rounded-2xl h-14 focus:ring-sky-500/10 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-300 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock className="w-3 h-3" /> 希望時間帯
              </label>
              <div className="relative">
                <select 
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full bg-white border border-sky-200 text-sky-900 rounded-2xl h-14 px-5 text-sm focus:ring-sky-500/10 appearance-none outline-none shadow-sm"
                >
                  <option value="">選択してください</option>
                  <option value="morning">午前 (9:00 - 12:00)</option>
                  <option value="afternoon">午後 (12:00 - 17:00)</option>
                  <option value="evening">夜間 (17:00 - 21:00)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sky-300">
                   <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-sky-300 uppercase tracking-widest flex items-center gap-2 px-1">
              <MessageSquare className="w-3 h-3" /> メッセージ・ご要望
            </label>
            <Textarea 
              placeholder="特定の週や課題についてなど..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white border border-sky-200 text-sky-900 rounded-2xl min-h-[120px] focus:ring-sky-500/10 shadow-sm"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-sky-400 hover:bg-sky-500 text-white border border-white/20 rounded-2xl font-black tracking-widest text-sm group/btn transition-all duration-500 shadow-xl shadow-sky-400/20"
          >
            {loading ? '送信中...' : 'リクエストを送信する'}
            <Send className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform opacity-50" />
          </Button>
        </form>
      </div>
    </div>
  );
}
