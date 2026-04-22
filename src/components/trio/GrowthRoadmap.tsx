'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GrowthRoadmapProps {
  currentStep?: number; // 1-5
}

export default function GrowthRoadmap({ currentStep = 1 }: GrowthRoadmapProps) {
  const steps = [
    { title: 'STEP 1', label: '水慣れ・浮力', description: '水への恐怖心をなくし、浮く感覚をマスター。' },
    { title: 'STEP 2', label: 'キック・推進力', description: '効率的なキックで前に進む力を養います。' },
    { title: 'STEP 3', label: 'ストローク・呼吸', description: '腕の動きと呼吸を連動させ、12.5mを目指します。' },
    { title: 'STEP 4', label: 'フォーム・安定性', description: '論理的なフォームで、疲れにくい泳ぎを追求。' },
    { title: 'STEP 5', label: '25m完泳', description: 'ついに目標の25mを完走。一生モノのスキルを。' },
  ];

  return (
    <div className="space-y-8" id="roadmap">
      <div className="flex flex-col gap-2 px-2">
        <h2 className="text-xl font-black text-white tracking-tight">あなたの成長ロードマップ</h2>
        <p className="text-xs text-slate-500 font-medium tracking-wider">ログインするたびに、現在地を確認しましょう。</p>
      </div>

      <div className="relative bg-[#0A192F]/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10 space-y-10">
          {/* Progress Bar Background */}
          <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-white/10 md:left-1/2 md:-ml-px md:hidden" />

          <div className="space-y-8">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;

              return (
                <div key={step.title} className="flex gap-6 items-start">
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700",
                      isCompleted ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" :
                      isCurrent ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-600/10 scale-110" :
                      "bg-white/5 text-slate-500 border border-white/10"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-black">{stepNumber}</span>}
                    </div>
                  </div>
                  
                  <div className="flex-1 pt-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em]",
                        isCurrent ? "text-indigo-400" : "text-slate-500"
                      )}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className={cn(
                        "text-base font-black tracking-tight",
                        isCurrent ? "text-white" : "text-slate-400"
                      )}>
                        {step.label}
                      </h4>
                      {isCurrent && (
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
