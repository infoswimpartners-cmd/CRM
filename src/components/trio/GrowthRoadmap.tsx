'use client';

import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
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
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-100 shadow-sm">
            <Sparkles className="w-5 h-5 text-sky-600" />
          </div>
          <h2 className="text-xl font-black text-sky-950 tracking-tight">成長ロードマップ</h2>
        </div>
        <p className="text-[11px] text-sky-600/60 font-bold tracking-wider px-1 uppercase">Track your logical evolution</p>
      </div>

      <div className="relative glass-card p-6 md:p-10 overflow-hidden border-sky-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10 space-y-12">
          {/* Progress Bar Background (Mobile hidden) */}
          <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-sky-100 md:left-[23px]" />

          <div className="space-y-10">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;

              return (
                <div key={step.title} className="flex gap-6 items-start group">
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10",
                      isCompleted ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" :
                      isCurrent ? "bg-white text-sky-600 shadow-xl shadow-sky-500/10 ring-4 ring-sky-500/5 border border-sky-200 scale-110" :
                      "bg-white text-sky-300 border border-sky-100"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-sm font-black">{stepNumber}</span>}
                    </div>
                  </div>
                  
                  <div className="flex-1 pt-1 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em]",
                        isCurrent ? "text-sky-500" : "text-sky-300"
                      )}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <div className="h-1.5 w-1.5 bg-sky-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className={cn(
                        "text-lg font-black tracking-tight",
                        isCurrent ? "text-sky-950" : isCompleted ? "text-sky-800/70" : "text-sky-300"
                      )}>
                        {step.label}
                      </h4>
                      {(isCurrent || isCompleted) && (
                        <p className={cn(
                          "text-xs leading-relaxed font-medium transition-colors",
                          isCurrent ? "text-sky-600/80" : "text-sky-400"
                        )}>
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
