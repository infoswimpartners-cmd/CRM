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
      <div className="bg-[#0A192F]/40 backdrop-blur-xl border border-emerald-500/20 rounded-[2.5rem] p-10 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">リクエスト送信完了</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            ご希望を承りました。調整が可能な場合、<br/>管理者よりお電話またはメールにてご連絡いたします。
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSuccess(false)}
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl"
        >
          別のリクエストを送る
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#0A192F]/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden" id="request">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-black text-white tracking-tight">別日レッスンのリクエスト</h2>
          <p className="text-xs text-slate-500 font-medium tracking-wider">
            上記の日程以外をご希望の場合は、こちらからお知らせください。
          </p>
          <div className="mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] text-amber-500 font-bold leading-relaxed">
              ※2名以上が集まった時点で施設予約をいたします。施設予約ができる場合のみ開催となります。あらかじめご了承ください。
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                <Calendar className="w-3 h-3" /> 希望日
              </label>
              <Input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:ring-indigo-500/20 focus:border-indigo-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock className="w-3 h-3" /> 希望時間帯
              </label>
              <select 
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-[#0A192F]/80 border-white/10 text-white rounded-xl h-12 px-4 text-sm focus:ring-indigo-500/20 focus:border-indigo-500/50 appearance-none"
              >
                <option value="">選択してください</option>
                <option value="morning">午前 (9:00 - 12:00)</option>
                <option value="afternoon">午後 (12:00 - 17:00)</option>
                <option value="evening">夜間 (17:00 - 21:00)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <MessageSquare className="w-3 h-3" /> メッセージ・ご要望
            </label>
            <Textarea 
              placeholder="特定の週や時間、課題についてなど..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl min-h-[100px] focus:ring-indigo-500/20 focus:border-indigo-500/50"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-2xl font-black tracking-widest text-sm group/btn transition-all duration-500"
          >
            {loading ? '送信中...' : 'リクエストを送信する'}
            <Send className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform opacity-30" />
          </Button>
        </form>
      </div>
    </div>
  );
}
