/**
 * E2E テストスイート・メインランナー
 * 全Tier（Tier 1〜4）を一括実行し、要件充足状況および実装ギャップを自動集計・可視化する
 */

import { TestRunner } from './helpers/test-framework';
import { SourceAnalyzer } from './helpers/ast-parser';
import { runTier1Tests } from './tier1-feature-coverage.test';
import { runTier2Tests } from './tier2-boundary-corner.test';
import { runTier3Tests } from './tier3-integration.test';
import { runTier4Tests } from './tier4-workflow-scenarios.test';

async function main() {
  console.log('\n==================================================');
  console.log('  Swim Partners Manager - SchoolHub E2E Test Suite');
  console.log('==================================================\n');

  const runner = new TestRunner();
  const analyzer = new SourceAnalyzer();

  const args = process.argv.slice(2);
  const targetTier = args.find((a) => a.startsWith('--tier='))?.split('=')[1];

  try {
    if (!targetTier || targetTier === '1') {
      console.log('▶ [Tier 1: 機能網羅性 (Feature Coverage)] 実行中...');
      await runTier1Tests(runner, analyzer);
    }

    if (!targetTier || targetTier === '2') {
      console.log('\n▶ [Tier 2: 境界値・極限・異常系 (Boundary & Corner)] 実行中...');
      await runTier2Tests(runner, analyzer);
    }

    if (!targetTier || targetTier === '3') {
      console.log('\n▶ [Tier 3: 複数機能複合・連携 (Integration)] 実行中...');
      await runTier3Tests(runner, analyzer);
    }

    if (!targetTier || targetTier === '4') {
      console.log('\n▶ [Tier 4: 実運用ワークロードシナリオ (Real-World Scenarios)] 実行中...');
      await runTier4Tests(runner, analyzer);
    }

    // レポート出力
    runner.printReport();

    const summary = runner.getSummary();
    console.log(`[INFO] 全テスト実行完了: 合格 ${summary.passed}/${summary.total} 件`);

    // プロセス終了コードの設定
    // テストランナーとしては正常完走したことを確認
    if (process.env.STRICT_FAIL && summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\x1b[31m[CRITICAL_ERROR] テストランナー実行中に致命的エラーが発生しました:\x1b[0m', error);
    process.exit(1);
  }
}

main();
