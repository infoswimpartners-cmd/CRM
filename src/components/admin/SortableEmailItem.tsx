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

export function SortableEmailItem({ tmpl, isSelected, onClick }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tmpl.id });

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
                ? 'bg-cyan-50 border-cyan-200 shadow-sm'
                : 'bg-white border-transparent hover:bg-gray-50'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="pr-2 flex items-center justify-center cursor-move text-gray-400 hover:text-gray-600"
            >
                <GripVertical size={16} />
            </div>

            <div className="flex-1 cursor-pointer" onClick={onClick}>
                <div className="font-semibold text-gray-800 break-all">{tmpl.subject}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="text-xs text-gray-400 font-mono">{tmpl.key}</div>
                    {tmpl.is_approval_required && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-orange-100 text-orange-800 border-none">承認必須</Badge>
                    )}
                    {tmpl.is_auto_send_enabled === false && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-gray-100 text-gray-800 border-none">自動送信OFF</Badge>
                    )}
                </div>
                <div className="text-xs text-gray-500 mt-2 line-clamp-2 text-ellipsis overflow-hidden h-8">
                    {tmpl.description}
                </div>
            </div>
        </div>
    );
}
