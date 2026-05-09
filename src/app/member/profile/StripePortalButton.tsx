'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { createStripePortalSession } from '@/actions/member/profile';
import { toast } from 'sonner';

export default function StripePortalButton() {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const res = await createStripePortalSession();
            if (res.url) {
                window.location.href = res.url;
            } else if (res.error) {
                toast.error(res.error);
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="w-full max-w-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 group"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                    <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>クレジットカード情報を変更する</span>
                    <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </>
            )}
        </button>
    );
}
