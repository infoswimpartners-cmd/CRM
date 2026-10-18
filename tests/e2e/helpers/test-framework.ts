/**
 * E2Eテスト実行フレームワーク & アサーションエンジン
 * 要件駆動・不透明ボックス検証のための独立したテスト実行基盤
 */

export type TestTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';

export interface TestCaseResult {
  id: string;
  tier: TestTier;
  feature: string;
  title: string;
  expectationSource: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  durationMs: number;
  error?: Error;
  details?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: TestCaseResult[];
}

export class TestRunner {
  private results: TestCaseResult[] = [];
  private currentTier: TestTier = 'Tier 1';
  private currentFeature: string = 'General';

  public setContext(tier: TestTier, feature: string) {
    this.currentTier = tier;
    this.currentFeature = feature;
  }

  /**
   * テストケースの実行
   * @param id テストID (例: T1-F1-01)
   * @param title テスト概要
   * @param expectationSource 期待値導出元仕様（ORIGINAL_REQUEST.md / PROJECT.md等）
   * @param fn テスト実行関数
   */
  public async test(
    id: string,
    title: string,
    expectationSource: string,
    fn: () => void | Promise<void>
  ): Promise<TestCaseResult> {
    const startTime = performance.now();
    try {
      await fn();
      const durationMs = Math.round(performance.now() - startTime);
      const result: TestCaseResult = {
        id,
        tier: this.currentTier,
        feature: this.currentFeature,
        title,
        expectationSource,
        status: 'PASS',
        durationMs,
      };
      this.results.push(result);
      console.log(`  \x1b[32m✔\x1b[0m [${id}] ${title} (${durationMs}ms)`);
      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const result: TestCaseResult = {
        id,
        tier: this.currentTier,
        feature: this.currentFeature,
        title,
        expectationSource,
        status: 'FAIL',
        durationMs,
        error: err instanceof Error ? err : new Error(String(err)),
        details: err?.message || String(err),
      };
      this.results.push(result);
      console.log(`  \x1b[31m✖\x1b[0m [${id}] ${title} (${durationMs}ms)`);
      console.log(`    \x1b[31mError:\x1b[0m ${result.details}`);
      console.log(`    \x1b[33mSource:\x1b[0m ${expectationSource}`);
      return result;
    }
  }

  /**
   * スキップされたテストの記録
   */
  public skip(
    id: string,
    title: string,
    expectationSource: string,
    reason: string
  ): TestCaseResult {
    const result: TestCaseResult = {
      id,
      tier: this.currentTier,
      feature: this.currentFeature,
      title,
      expectationSource,
      status: 'SKIPPED',
      durationMs: 0,
      details: reason,
    };
    this.results.push(result);
    console.log(`  \x1b[33m-\x1b[0m [${id}] ${title} (SKIPPED: ${reason})`);
    return result;
  }

  /**
   * 集計サマリーの取得
   */
  public getSummary(): TestSuiteSummary {
    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;
    const skipped = this.results.filter((r) => r.status === 'SKIPPED').length;
    const durationMs = this.results.reduce((sum, r) => sum + r.durationMs, 0);

    return {
      total: this.results.length,
      passed,
      failed,
      skipped,
      durationMs,
      results: this.results,
    };
  }

  /**
   * 結果レポートのコンソール出力
   */
  public printReport(): void {
    const summary = this.getSummary();
    console.log('\n==================================================');
    console.log('              E2E TEST SUITE REPORT               ');
    console.log('==================================================');
    console.log(`総テスト数 : ${summary.total}`);
    console.log(`\x1b[32m合格 (PASS) : ${summary.passed}\x1b[0m`);
    console.log(`\x1b[31m不合格 (FAIL): ${summary.failed}\x1b[0m`);
    console.log(`\x1b[33mスキップ   : ${summary.skipped}\x1b[0m`);
    console.log(`総所要時間 : ${(summary.durationMs / 1000).toFixed(2)}s`);
    console.log('--------------------------------------------------');

    // 階層別集計
    const tiers: TestTier[] = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
    for (const tier of tiers) {
      const tierResults = summary.results.filter((r) => r.tier === tier);
      const tierPass = tierResults.filter((r) => r.status === 'PASS').length;
      const tierFail = tierResults.filter((r) => r.status === 'FAIL').length;
      console.log(
        `${tier.padEnd(8)}: 計 ${tierResults.length.toString().padStart(2)} 件 | \x1b[32m${tierPass} PASS\x1b[0m | \x1b[31m${tierFail} FAIL\x1b[0m`
      );
    }
    console.log('==================================================\n');

    if (summary.failed > 0) {
      console.log('\x1b[31m[!] 未解決の不整合・実装ギャップ一覧:\x1b[0m');
      summary.results
        .filter((r) => r.status === 'FAIL')
        .forEach((f, idx) => {
          console.log(` ${idx + 1}. [${f.id}] ${f.title}`);
          console.log(`    要件仕様: ${f.expectationSource}`);
          console.log(`    失敗原因: ${f.details}`);
        });
      console.log('');
    }
  }
}

/**
 * 簡易アサーションユーティリティ
 */
export const assert = {
  ok(condition: any, message?: string) {
    if (!condition) {
      throw new Error(message || 'Assertion failed: expected truthy value');
    }
  },
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(
        message ||
          `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  },
  notEqual<T>(actual: T, expected: T, message?: string) {
    if (actual === expected) {
      throw new Error(
        message ||
          `Assertion failed: expected ${JSON.stringify(actual)} to NOT equal ${JSON.stringify(expected)}`
      );
    }
  },
  includes(actual: string, substring: string, message?: string) {
    if (!actual.includes(substring)) {
      throw new Error(
        message ||
          `Assertion failed: expected string to contain "${substring}"`
      );
    }
  },
  notIncludes(actual: string, substring: string, message?: string) {
    if (actual.includes(substring)) {
      throw new Error(
        message ||
          `Assertion failed: expected string to NOT contain "${substring}"`
      );
    }
  },
  matches(actual: string, regex: RegExp, message?: string) {
    if (!regex.test(actual)) {
      throw new Error(
        message ||
          `Assertion failed: expected string to match pattern ${regex.toString()}`
      );
    }
  },
  notMatches(actual: string, regex: RegExp, message?: string) {
    if (regex.test(actual)) {
      throw new Error(
        message ||
          `Assertion failed: expected string to NOT match pattern ${regex.toString()}`
      );
    }
  },
  greaterThanOrEqual(actual: number, expected: number, message?: string) {
    if (actual < expected) {
      throw new Error(
        message ||
          `Assertion failed: expected ${actual} >= ${expected}`
      );
    }
  },
  throws(fn: () => void, message?: string) {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Assertion failed: expected function to throw error');
    }
  },
};
