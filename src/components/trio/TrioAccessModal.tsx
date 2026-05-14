'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Info, Loader2, Sparkles } from 'lucide-react';
import { getAppConfig } from '@/actions/app_configs';

interface TrioAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityName: string;
}

export default function TrioAccessModal({ isOpen, onClose, facilityName }: TrioAccessModalProps) {
  const [data, setData] = useState<{ text: string; mapEmbed?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchContent = async () => {
        setLoading(true);
        // 施設ごとの設定キー: trio_access_{施設名}
        const configJson = await getAppConfig(`trio_access_${facilityName}`);
        if (configJson) {
          try {
            setData(JSON.parse(configJson));
          } catch (e) {
            // 互換性維持: JSONでない場合はテキストとして扱う
            setData({ text: configJson });
          }
        } else {
          setData(null);
        }
        setLoading(false);
      };
      fetchContent();
    }
  }, [isOpen, facilityName]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-100 shadow-[0_40px_120px_rgba(56,189,248,0.15)] rounded-[2.5rem] overflow-hidden p-0">
        <div className="relative">
          {/* Decorative Gradient Background (Bright) */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-transparent to-transparent pointer-events-none" />
          
          <div className="p-8 space-y-8 relative z-10">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">{facilityName} - Access</DialogTitle>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">集合場所・入館方法のご案内</p>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-[200px] flex flex-col">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                  <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-400 animate-pulse">Loading Information...</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {data?.mapEmbed && (
                    <div 
                      className="w-full h-[250px] rounded-3xl overflow-hidden border border-slate-100 shadow-sm"
                      dangerouslySetInnerHTML={{ 
                        __html: data.mapEmbed.replace(/width="[0-9%]+"/, 'width="100%"').replace(/height="[0-9%]+"/, 'height="100%"') 
                      }}
                    />
                  )}

                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-sky-500/10 transition-colors" />
                    
                    <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-medium relative z-10">
                      {data?.text || (
                        <div className="text-center py-8 space-y-3">
                          <Info className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-slate-400 italic">現在、アクセス情報は設定されていません。</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-3 px-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                      当日はお気をつけてお越しください。<br/>スタッフ一同お待ちしております。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
