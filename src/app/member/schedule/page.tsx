import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import BookingRequestForm from './_components/BookingRequestForm';

export default async function MemberSchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/member/login');
    }

    // TODO: Fetch available slots and current requests
    // const { data: slots } = await supabase.from('...').select('*');

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">レッスンの予約</h1>

            <Card>
                <CardHeader>
                    <CardTitle>リクエスト予約</CardTitle>
                </CardHeader>
                <CardContent>
                    <BookingRequestForm />
                </CardContent>
            </Card>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-2">予約について</h3>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    <li>毎月20日〜25日がリクエスト受付期間です。</li>
                    <li>ご希望の日時を選択してリクエストを送信してください。</li>
                    <li>コーチが確認後、確定または調整のご連絡をいたします。</li>
                </ul>
            </div>
        </div>
    );
}
