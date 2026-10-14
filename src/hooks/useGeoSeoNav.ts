'use client';

import { useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type {
    GeoSeoNavGroup,
    GeoSeoNavTab,
    GeoSeoNavState,
} from '@/types/geo-seo-navigation';
import {
    resolveGeoSeoNavState,
    GROUP_DEFAULT_TAB_MAP,
    TAB_TO_GROUP_MAP,
} from '@/lib/geo-seo-navigation';

export interface UseGeoSeoNavReturn {
    activeGroup: GeoSeoNavGroup;
    activeTab: GeoSeoNavTab;
    setActiveGroup: (group: GeoSeoNavGroup) => void;
    setActiveTab: (tab: GeoSeoNavTab) => void;
    setNavState: (group: GeoSeoNavGroup, tab: GeoSeoNavTab) => void;
    getHref: (group: GeoSeoNavGroup, tab?: GeoSeoNavTab) => string;
}

/**
 * /admin/geo-seo の2層ナビゲーションとURL（?group=xxx&tab=yyy）を双方向同期するカスタムフック
 * 
 * - URL as Single Source of Truth（単一情報源）による二重ステート・無限ループの排除
 * - 旧URLパラメータ（?tab=seo 等）の自動正規化（router.replace）
 * - タブクリックやプログラム切り替え時の履歴スタック（router.push）
 */
export function useGeoSeoNav(): UseGeoSeoNavReturn {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const rawGroup = searchParams.get('group');
    const rawTab = searchParams.get('tab');

    // 1. URLパラメータからグループとタブを導出（Derived State）
    const navState = useMemo<GeoSeoNavState>(() => {
        return resolveGeoSeoNavState(rawGroup, rawTab);
    }, [rawGroup, rawTab]);

    // 2. URLの正規化処理（旧パラメータや欠落クエリを正規形式へ replace 変換）
    // 無限ループ防止: 現在のURLと導出結果が既に一致している場合は絶対に何もしない
    useEffect(() => {
        const isCanonical = rawGroup === navState.group && rawTab === navState.tab;
        if (!isCanonical) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('group', navState.group);
            params.set('tab', navState.tab);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [navState.group, navState.tab, rawGroup, rawTab, pathname, router, searchParams]);

    // 3. ユーザー操作・プログラム切り替え用ハンドラー（router.push で履歴をスタック）
    const setNavState = useCallback(
        (newGroup: GeoSeoNavGroup, newTab: GeoSeoNavTab) => {
            if (newGroup === navState.group && newTab === navState.tab) {
                return;
            }
            const params = new URLSearchParams(searchParams.toString());
            params.set('group', newGroup);
            params.set('tab', newTab);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [navState.group, navState.tab, pathname, router, searchParams]
    );

    // グループ変更（そのグループのデフォルトタブを自動設定）
    const setActiveGroup = useCallback(
        (group: GeoSeoNavGroup) => {
            const defaultTab = GROUP_DEFAULT_TAB_MAP[group];
            setNavState(group, defaultTab);
        },
        [setNavState]
    );

    // タブ変更（タブが属する親グループを自動解決）
    const setActiveTab = useCallback(
        (tab: GeoSeoNavTab) => {
            const parentGroup = TAB_TO_GROUP_MAP[tab] || navState.group;
            setNavState(parentGroup, tab);
        },
        [navState.group, setNavState]
    );

    // リンク要素用の URL 生成ヘルパー
    const getHref = useCallback(
        (group: GeoSeoNavGroup, tab?: GeoSeoNavTab) => {
            const targetTab = tab || GROUP_DEFAULT_TAB_MAP[group];
            const params = new URLSearchParams(searchParams.toString());
            params.set('group', group);
            params.set('tab', targetTab);
            return `${pathname}?${params.toString()}`;
        },
        [pathname, searchParams]
    );

    return {
        activeGroup: navState.group,
        activeTab: navState.tab,
        setActiveGroup,
        setActiveTab,
        setNavState,
        getHref,
    };
}
