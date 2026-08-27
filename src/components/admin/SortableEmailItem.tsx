import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmailTemplate } from '@/actions/email-template';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';

interface Props {
    tmpl: EmailTemplate;
    isSelected: boolean;
    onClick: () => void;
}

export function getTemplateMeta(key: string) {
    if (key.includes('lesson_reminder') || key.includes('notice_lesson_report') || key.includes('lesson_reserved')) {
        return {
            category: 'lesson' as const,
            categoryLabel: 'レッスン',
            target: (key.includes('notice') || key.includes('reserved')) ? 'coach_admin' as const : 'student' as const,
            targetLabel: (key.includes('notice') || key.includes('reserved')) ? 'コーチ・管理者' : '生徒宛て',
            channels: key === 'lesson_reminder' ? ['LINE', 'メール'] : ['メール', 'Chat']
        }
    }
    if (key.includes('trial') || key.includes('reception') || key.includes('lead')) {
        return {
            category: 'trial' as const,
            categoryLabel: '体験レッスン',
            target: key.includes('admin') ? 'coach_admin' as const : 'student' as const,
            targetLabel: key.includes('admin') ? '管理者・コーチ' : '生徒宛て',
            channels: key.includes('admin') ? ['Chat', 'メール'] : ['メール', 'LINE']
        }
    }
    if (key.includes('enrollment') || key.includes('billing') || key.includes('payment')) {
        return {
            category: 'billing' as const,
            categoryLabel: '入会・決済',
            target: 'student' as const,
            targetLabel: '生徒宛て',
            channels: ['メール']
        }
    }
    if (key.includes('inquiry')) {
        return {
            category: 'inquiry' as const,
            categoryLabel: 'お問い合わせ',
            target: 'student' as const,
            targetLabel: '生徒宛て',
            channels: ['メール']
        }
    }
    return {
        category: 'other' as const,
        categoryLabel: 'その他',
        target: 'all' as const,
        targetLabel: '一般',
        channels: ['メール']
    }
}

export function SortableEmailItem({ tmpl, isSelected, onClick }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tmpl.id });

    const meta = getTemplateMeta(tmpl.key);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex w-full text-left p-3 rounded-lg transition-all border ${isSelected
                ? 'bg-slate-50 border-slate-400 shadow-sm ring-1 ring-slate-400'
                : 'bg-white border-slate-200 hover:bg-slate-50/60'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="pr-2 flex items-center justify-center cursor-move text-slate-400 hover:text-slate-600"
            >
                <GripVertical size={16} />
            </div>

            <div className="flex-1 cursor-pointer min-w-0" onClick={onClick}>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-300 font-normal">
                        {meta.categoryLabel}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-normal ${meta.target === 'student' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {meta.targetLabel}
                    </Badge>
                    {meta.channels.includes('LINE') && (
                        <span className="text-[10px] px-1 py-0 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            LINE
                        </span>
                    )}
                </div>

                <div className="font-semibold text-slate-900 text-sm break-all line-clamp-1">{tmpl.subject}</div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="text-[11px] text-slate-400 font-mono break-all">{tmpl.key}</div>
                    {tmpl.is_approval_required && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-rose-50 text-rose-700 border border-rose-200 font-normal">承認必須</Badge>
                    )}
                    {tmpl.is_auto_send_enabled === false && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-slate-100 text-slate-600 border border-slate-200 font-normal">自動送信OFF</Badge>
                    )}
                </div>

                {tmpl.description && (
                    <div className="text-xs text-slate-500 mt-1.5 line-clamp-1 text-ellipsis overflow-hidden">
                        {tmpl.description}
                    </div>
                )}
            </div>
        </div>
    );
}
