import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { ArrowLeft, Plus, Ticket as TicketIcon, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { purchaseTicket } from './actions';
import TicketCard from '@/components/member/TicketCard';
import TransactionHistory from '@/components/member/TransactionHistory';

export default async function TicketsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    let student = null;
    let transactions = [];

    const fetchStudentData = async (queryUser: boolean, userId: string) => {
        const client = queryUser ? supabase : createAdminClient();
        const field = queryUser ? 'auth_user_id' : 'line_user_id';

        const { data: studentData, error } = await client
            .from('students')
            .select('*')
            .eq(field, userId)
            .single();

        if (error || !studentData) return null;

        // Fetch Transactions
        let txs = [];
        try {
            const { data, error: txError } = await client
                .from('ticket_transactions')
                .select('*')
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false });
            if (!txError && data) txs = data;
        } catch (e) {
            console.error('Failed to fetch transactions:', e);
        }

        return { student: studentData, transactions: txs };
    };

    if (user) {
        const result = await fetchStudentData(true, user.id);
        if (result) {
            student = result.student;
            transactions = result.transactions;
        }
    } else if (session?.user) {
        const lineUserId = (session.user as any).id;
        const result = await fetchStudentData(false, lineUserId);
        if (result) {
            student = result.student;
            transactions = result.transactions;
        }
    }

    if (!student) return <div>Loading...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Link href="/member/dashboard" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <h1 className="text-xl font-bold text-gray-800">チケット管理</h1>
            </div>

            {/* Balance Card */}
            <section className="relative z-10">
                <TicketCard balance={student.current_tickets || 0} />
            </section>

            {/* Purchase Action */}
            <section>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-6 rounded-2xl shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02]">
                            <Plus className="mr-2 h-5 w-5" />
                            チケットを購入する
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20">
                        <DialogHeader>
                            <DialogTitle>チケット購入</DialogTitle>
                            <DialogDescription>
                                お得なセット販売もございます。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* 1 Ticket */}
                            <form action={purchaseTicket} className="w-full">
                                <input type="hidden" name="amount" value="1" />
                                <input type="hidden" name="price" value="5500" />
                                <input type="hidden" name="name" value="レッスンチケット（1回分）" />
                                <Button type="submit" variant="outline" className="w-full justify-between h-auto p-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 p-3 rounded-full text-gray-600 group-hover:bg-blue-200 group-hover:text-blue-700 transition-colors">
                                            <TicketIcon className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-gray-800">1回券</div>
                                            <div className="text-xs text-gray-500">都度利用のみ</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-gray-800">¥5,500</div>
                                </Button>
                            </form>

                            {/* 4 Tickets */}
                            <form action={purchaseTicket} className="w-full relative">
                                <input type="hidden" name="amount" value="4" />
                                <input type="hidden" name="price" value="20000" />
                                <input type="hidden" name="name" value="レッスンチケット（4回セット）" />
                                {/* Best Value Badge */}
                                <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1 z-10">
                                    <Star className="w-3 h-3 fill-current" />
                                    人気 No.1
                                </div>
                                <Button type="submit" variant="outline" className="w-full justify-between h-auto p-4 rounded-xl border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400 transition-all group relative overflow-hidden">
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <TicketIcon className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-blue-900">4回セット</div>
                                            <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">
                                                ¥2,000 お得
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-black text-blue-700 text-lg relative z-10">¥20,000</div>
                                </Button>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </section>

            {/* History */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 px-1 flex items-center gap-2">
                    <Check className="w-4 h-4 text-gray-400" />
                    取引履歴
                </h2>
                <TransactionHistory transactions={transactions} />
            </section>
        </div>
    );
}
