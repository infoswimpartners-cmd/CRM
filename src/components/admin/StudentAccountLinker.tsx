'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { linkStudentToAuthUser, unlinkStudentAuthUser, getAllAuthUsers } from '@/actions/auth_link';
import { KeyRound, Unplug, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

interface StudentAccountLinkerProps {
    studentId: string;
    currentAuthUserId: string | null;
    studentEmail?: string;
}

export function StudentAccountLinker({ studentId, currentAuthUserId, studentEmail }: StudentAccountLinkerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const fetchUsers = async () => {
        setFetchingUsers(true);
        const res = await getAllAuthUsers();
        if (res.success && res.users) {
            setUsers(res.users);
            // studentEmailと一致するユーザーがいればデフォルトで選択
            if (studentEmail) {
                const matched = res.users.find(u => u.email === studentEmail);
                if (matched) setSelectedUserId(matched.id);
            }
        } else {
            toast.error(res.error || 'ユーザー情報の取得に失敗しました');
        }
        setFetchingUsers(false);
    };

    // ダイアログを開いたときにユーザーリストを取得する
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && users.length === 0) {
            fetchUsers();
        }
    };

    const handleLink = async () => {
        if (!selectedUserId) {
            toast.error('紐付けるユーザーを選択してください');
            return;
        }
        setLoading(true);
        const res = await linkStudentToAuthUser(studentId, selectedUserId);
        if (res.success) {
            toast.success('アカウントを連携しました');
            setIsOpen(false);
        } else {
            toast.error(res.error || 'エラーが発生しました');
        }
        setLoading(false);
    };

    const handleUnlink = async () => {
        if (!confirm('本当にアカウントの連携を解除しますか？\n（ユーザーはこの生徒の情報にアクセスできなくなります）')) {
            return;
        }
        setLoading(true);
        const res = await unlinkStudentAuthUser(studentId);
        if (res.success) {
            toast.success('連携を解除しました');
        } else {
            toast.error(res.error || 'エラーが発生しました');
        }
        setLoading(false);
    };

    return (
        <div className="pt-2 border-t border-slate-100">
            <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                システムアカウント連携
            </Label>
            
            {currentAuthUserId ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mt-1">
                    <div>
                        <div className="font-bold text-blue-800 text-sm">連携済み</div>
                        <div className="text-xs text-blue-600 font-mono hidden sm:block truncate max-w-[200px]">
                            ID: {currentAuthUserId}
                        </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-white text-red-600 hover:bg-red-50 hover:text-red-700 w-full"
                            onClick={handleUnlink}
                            disabled={loading}
                        >
                            <Unplug className="w-4 h-4 mr-2" /> 解除
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg mt-1">
                    <div>
                        <div className="text-sm text-slate-500 font-medium">未連携</div>
                    </div>
                    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full sm:w-auto">
                                <KeyRound className="w-4 h-4 mr-2 text-blue-500" /> 手動連携する
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>アカウントの紐付け</DialogTitle>
                                <DialogDescription>
                                    システムに登録されている認証ユーザー（Auth）から、この生徒と紐付けるアカウントを選択してください。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div>
                                    <Label className="mb-2 block">連携するユーザーを選択</Label>
                                    <Select 
                                        value={selectedUserId} 
                                        onValueChange={setSelectedUserId}
                                        disabled={fetchingUsers}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={fetchingUsers ? "ユーザー情報を取得中..." : "ユーザーを選択してください"} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {users.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.email || 'Email未登録'} {u.name ? `(${u.name})` : ''} - {u.provider}
                                                </SelectItem>
                                            ))}
                                            {users.length === 0 && !fetchingUsers && (
                                                <SelectItem value="empty" disabled>ユーザーが見つかりません</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={fetchUsers} 
                                    disabled={fetchingUsers}
                                    className="text-gray-500"
                                >
                                    <RefreshCcw className={`w-3 h-3 mr-2 ${fetchingUsers ? 'animate-spin' : ''}`} />
                                    リストを再取得
                                </Button>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>キャンセル</Button>
                                <Button onClick={handleLink} disabled={loading || !selectedUserId || selectedUserId === 'empty'}>
                                    連携を実行する
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    );
}
