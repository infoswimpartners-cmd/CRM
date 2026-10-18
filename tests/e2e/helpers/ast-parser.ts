/**
 * ソースコード構造・トークン・コンポーネント契約解析ヘルパー
 * 不透明ボックス検証のために静的ファイル・AST・CSSトークンを検査する
 */

import * as fs from 'fs';
import * as path from 'path';

export class SourceAnalyzer {
  private projectRoot: string;
  private fileCache: Map<string, string> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * プロジェクト内のファイルを読み込む
   */
  public getFileContent(relativePath: string): string {
    if (this.fileCache.has(relativePath)) {
      return this.fileCache.get(relativePath)!;
    }
    const fullPath = path.resolve(this.projectRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath} (${fullPath})`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    this.fileCache.set(relativePath, content);
    return content;
  }

  /**
   * ファイルが存在するか確認
   */
  public fileExists(relativePath: string): boolean {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    return fs.existsSync(fullPath);
  }

  /**
   * globals.css内のSchoolHubトークン検証
   */
  public inspectGlobalsCss(): {
    raw: string;
    hasBaseBackground: boolean;
    hasSkyBlueToken: boolean;
    hasPeriwinkleToken: boolean;
    hasGoldToken: boolean;
    hasMintToken: boolean;
    hasSoftCardShadow: boolean;
  } {
    const content = this.getFileContent('src/app/globals.css');
    return {
      raw: content,
      // #F8FAFC または #F9FBFD または --background: #F8FAFC / #F9FBFD
      hasBaseBackground:
        /--background:\s*#F[89]FB?F[CD]/i.test(content) ||
        /bg-\[#F[89]FB?F[CD]\]/i.test(content) ||
        /#F8FAFC/i.test(content),
      // #0284C7, #38BDF8, #E0F2FE, schoolhub-sky
      hasSkyBlueToken:
        /#0284C7/i.test(content) ||
        /#38BDF8/i.test(content) ||
        /#E0F2FE/i.test(content) ||
        /schoolhub-sky/i.test(content),
      // #9F9EFE, #EEF0FF, schoolhub-periwinkle
      hasPeriwinkleToken:
        /#9F9EFE/i.test(content) ||
        /#EEF0FF/i.test(content) ||
        /schoolhub-periwinkle/i.test(content),
      // #F4C233, #FEF9C3, schoolhub-gold
      hasGoldToken:
        /#F4C233/i.test(content) ||
        /#FEF9C3/i.test(content) ||
        /schoolhub-gold/i.test(content),
      // #10B981, #D1FAE5, schoolhub-mint
      hasMintToken:
        /#10B981/i.test(content) ||
        /#D1FAE5/i.test(content) ||
        /schoolhub-mint/i.test(content),
      // 0 1px 3px rgba(0,0,0,0.04) または SchoolHub調シャドウ
      hasSoftCardShadow:
        /0\s+1px\s+3px\s+rgba\(0,\s*0,\s*0,\s*0\.04\)/i.test(content) ||
        /shadow-\[0_1px_3px_rgba\(0,0,0,0\.04\)\]/i.test(content) ||
        /schoolhub-card/i.test(content),
    };
  }

  /**
   * badge.tsx内のSchoolHubバリアント検証
   */
  public inspectBadgeVariants(): {
    raw: string;
    hasSky: boolean;
    hasPeriwinkle: boolean;
    hasGold: boolean;
    hasMint: boolean;
  } {
    const content = this.getFileContent('src/components/ui/badge.tsx');
    return {
      raw: content,
      hasSky: /\bsky\s*:/i.test(content) || /sky-light/i.test(content),
      hasPeriwinkle:
        /\bperiwinkle\s*:/i.test(content) || /periwinkle-light/i.test(content),
      hasGold: /\bgold\s*:/i.test(content) || /gold-light/i.test(content),
      hasMint: /\bmint\s*:/i.test(content) || /mint-light/i.test(content),
    };
  }

  /**
   * admin/page.tsxの過度なグラデーション/巨大ぼかし円の有無検証
   */
  public inspectExcessiveGradients(): {
    has600pxBlur: boolean;
    has500pxBlur: boolean;
    hasDeepNeonGradient: boolean;
  } {
    const content = this.getFileContent('src/app/(dashboard)/admin/page.tsx');
    return {
      has600pxBlur: /w-\[600px\]\s+h-\[600px\]/i.test(content),
      has500pxBlur: /w-\[500px\]\s+h-\[500px\]/i.test(content),
      hasDeepNeonGradient: /bg-linear-to-bl\s+from-blue-500\/5/i.test(content),
    };
  }

  /**
   * admin/page.tsxの重複コントロールセンターカードの有無検証
   */
  public inspectControlCenterCards(): {
    hasControlCenterSection: boolean;
    hasDuplicateCards: boolean;
  } {
    const content = this.getFileContent('src/app/(dashboard)/admin/page.tsx');
    return {
      hasControlCenterSection: /コントロールセンター/i.test(content),
      hasDuplicateCards:
        /href:\s*["']\/admin\/masters["']/i.test(content) &&
        /href:\s*["']\/customers["']/i.test(content) &&
        /href:\s*["']\/admin\/coaches["']/i.test(content),
    };
  }

  /**
   * customers/page.tsxの生徒アバター・バッジ・レスポンシブ検証
   */
  public inspectCustomersTable(): {
    raw: string;
    hasInitialAvatar: boolean;
    hasStudentNumberBadge: boolean;
    hasCourseBadge: boolean;
    hasStatusBadge: boolean;
    hasMobileResponsiveLayout: boolean;
  } {
    const content = this.getFileContent('src/app/(dashboard)/customers/page.tsx');
    return {
      raw: content,
      // 頭文字アバター（Avatar or full_name[0] / slice(0, 1)）
      hasInitialAvatar:
        /<Avatar/i.test(content) ||
        /AvatarFallback/i.test(content) ||
        /student\.full_name\s*\?\.?\s*\[\s*0\s*\]/i.test(content) ||
        /charAt\(0\)/i.test(content) ||
        /slice\(0,\s*1\)/i.test(content),
      // 会員番号バッジ
      hasStudentNumberBadge:
        /student_number/i.test(content) &&
        (/Badge/i.test(content) || /bg-sky/i.test(content) || /#0035/i.test(content)),
      // コースバッジ
      hasCourseBadge:
        /membership_types?/i.test(content) &&
        (/Badge/i.test(content) || /rounded/i.test(content)),
      // ステータスバッジ
      hasStatusBadge:
        /student_statuses|status/i.test(content) &&
        (/Badge/i.test(content) || /statusLabels/i.test(content)),
      // モバイルレスポンシブ（テーブルをカード化、または hidden md:table / block md:hidden）
      hasMobileResponsiveLayout:
        /hidden\s+md:block/i.test(content) ||
        /md:hidden/i.test(content) ||
        /sm:hidden/i.test(content) ||
        /grid\s+grid-cols-1/i.test(content),
    };
  }
}
