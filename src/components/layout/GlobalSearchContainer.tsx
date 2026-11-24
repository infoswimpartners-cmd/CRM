import { GlobalSearch } from './GlobalSearch'

interface GlobalSearchContainerProps {
    isAdmin: boolean
}

/**
 * ページ遷移ごとの全件クエリ実行を避けるため、
 * 検索インデックスは GlobalSearch モーダルを開いたタイミングで /api/search-index から遅延取得する。
 */
export async function GlobalSearchContainer({ isAdmin }: GlobalSearchContainerProps) {
    return <GlobalSearch isAdmin={isAdmin} />
}
