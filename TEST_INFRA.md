# テスト実行環境・インフラ仕様書 (TEST_INFRA.md)

## 1. 概要
本書は、スイムパートナーズ（Swim Partners）における「SEO改善および体験レッスン獲得ファネル（管理画面商圏SEO・主要商圏LP・トップページ・体験予約フォーム）」の包括的E2Eテストスイートの実行環境、設計思想、カバレッジ、および実行手順を定義する。

## 2. テスト実行環境
- **ランタイム**: Node.js (v20+ 推奨) / TypeScript
- **実行エンジン**: `npx tsx`（Next.js App Router内部ロジック、サーバーアクション、APIルート、コンポーネント出力の高速直接検証）
- **フレームワーク整合性**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn UI
- **環境変数**: `.env.local`（Supabase, Google Chat Webhook 等の接続情報）

## 3. テスト階層構造 (Tiers 1 - 4)

| 階層 | テスト名称 | 検証スコープ | 目的・オラクル |
|---|---|---|---|
| **Tier 1** | Feature Coverage | R1: 管理画面SEO極限シンプル化<br>R2: 主要商圏LP内部最適化<br>R3: トップページ＆体験予約Webハイブリッド化 | 要件仕様書（ORIGINAL_REQUEST.md）に定義された全機能要件の存在と挙動を網羅検証 |
| **Tier 2** | Boundary & Corner Cases | 不正エリアID、空文字・不正URL保存、未認証セーフガード、極端な入力 | 悪意のある入力やエッジケースに対する堅牢性とフェイルセーフ動作を検証 |
| **Tier 3** | Cross-Feature Combinations | エリアLP ➔ 体験予約導線連携<br>実測検証エンジン ↔ LPメタデータ整合 | 複数モジュール間のインターフェース契約およびデータ連携の整合性を検証 |
| **Tier 4** | Real-World Scenarios | シナリオ1: 検索流入→LP→公営プール→Web体験予約完了<br>シナリオ2: 管理画面診断→URL登録→即時再検証完了 | 実際のユーザー・管理者による一連の業務・コンバージョンフローを完全再現検証 |

## 4. 厳格セキュリティ・データ分離制約（必須ルール）
- **テスト顧客データ制約**:
  - テストを実施する際、顧客は **会員番号0035 / テスト太郎** 以外は一切使用しない。
  - 万が一、0035以外の顧客番号（例: `0001`, `9999` 等）がテスト送信や予約処理に渡された場合、物理的に拒絶（例外スローまたはバリデーションエラー）されるガード機構を常時テスト・検証する。
- **本番データ保護**:
  - 実測検証エンジンにおいて外部への破壊的更新（DELETE/UPDATE等）は行わず、分離されたテスト用コンテキストで検証する。

## 5. テストスイート構成ファイル
- **E2Eテストスクリプト本体**:
  - `scripts/test_e2e_seo_funnel.ts`
- **関連検証対象ファイル**:
  - 管理画面: `src/app/(dashboard)/admin/geo-seo/page.tsx`, `src/components/admin/geo-seo/SpTrackerAreaSeoAuditCard.tsx`
  - 商圏診断エンジン: `src/lib/area-seo-audit.ts`, `src/actions/area-seo-actions.ts`
  - 商圏LP: `src/app/personal_swim/[area]/page.tsx`, `src/app/personal_swim/page.tsx`
  - トップページ: `src/app/page.tsx`, `src/components/home/PublicLandingPage.tsx`
  - 体験予約導線: `src/app/trial/page.tsx`, `src/app/api/trial-booking/route.ts`

## 6. テスト実行コマンド
```bash
# E2Eテストスイートの一括実行
npx tsx scripts/test_e2e_seo_funnel.ts

# 型検査
npx tsc --noEmit

# 本番ビルド検証
npm run build
```

## 7. 合格判定基準 (Pass Criteria)
1. `scripts/test_e2e_seo_funnel.ts` の全テストケース（Tier 1〜Tier 4）が Exit Code 0 で 100% パスすること。
2. 失敗（FAILED）テストが 0 件であること。
3. 会員番号0035「テスト太郎」の制約違反がないこと。
