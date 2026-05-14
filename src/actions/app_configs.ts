'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * 設定値を取得する
 */
export async function getAppConfig(key: string): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('app_configs')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // 存在しない場合
      console.error(`getAppConfig error (${key}):`, error);
      return null;
    }

    return data?.value || null;
  } catch (err) {
    console.error(`getAppConfig catch error (${key}):`, err);
    return null;
  }
}

/**
 * 設定値を更新する（管理者のみ）
 */
export async function updateAppConfig(key: string, value: string, description?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 管理者チェック
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // ユーザーがいない、または管理者でない場合はエラー
    // (Next-Authのセッションも確認すべきだが、一旦Supabase AuthのRoleを優先)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id || '')
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: '管理者権限が必要です。' };
    }

    const supabaseAdmin = createAdminClient();
    
    const upsertData: any = { key, value, updated_at: new Date().toISOString() };
    if (description) upsertData.description = description;

    const { error } = await supabaseAdmin
      .from('app_configs')
      .upsert(upsertData);

    if (error) {
      console.error(`updateAppConfig error (${key}):`, error);
      return { success: false, error: '設定の更新に失敗しました。' };
    }

    revalidatePath('/', 'layout'); // 広範囲にキャッシュをクリア
    return { success: true };
  } catch (err) {
    console.error(`updateAppConfig catch error (${key}):`, err);
    return { success: false, error: '通信エラーが発生しました。' };
  }
}
