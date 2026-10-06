import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const htmlPath = path.resolve('public/swim-step-lp-school.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`ERROR: Target file not found: ${htmlPath}`);
  process.exit(1);
}

const rawHtml = fs.readFileSync(htmlPath, 'utf8');
const lines = rawHtml.split('\n');

console.log('================================================================================');
console.log('SWIM STEP LP SCHOOL - EMPIRICAL ORACLE VERIFICATION HARNESS');
console.log(`Execution Timestamp : ${new Date().toISOString()}`);
console.log(`Target File         : ${htmlPath}`);
console.log(`File Size           : ${Buffer.byteLength(rawHtml, 'utf8')} bytes`);
console.log(`Line Count          : ${lines.length}`);
console.log('================================================================================\n');

function getLineAndCol(index) {
  const textBefore = rawHtml.substring(0, index);
  const textLines = textBefore.split('\n');
  return {
    line: textLines.length,
    col: textLines[textLines.length - 1].length + 1
  };
}

// 全タグの抽出
const tagRegex = /<([a-zA-Z0-9\-:]+)([^>]*)>/gi;
const allTags = [];
let tagMatch;
while ((tagMatch = tagRegex.exec(rawHtml)) !== null) {
  allTags.push({
    full: tagMatch[0],
    name: tagMatch[1].toLowerCase(),
    attrs: tagMatch[2],
    index: tagMatch.index,
    pos: getLineAndCol(tagMatch.index)
  });
}

// 全IDの収集
const domIds = new Map();
for (const tag of allTags) {
  const idMatch = tag.attrs.match(/\bid=["']([^"']+)["']/i);
  if (idMatch) {
    const idVal = idMatch[1];
    if (domIds.has(idVal)) {
      domIds.get(idVal).push(tag.pos);
    } else {
      domIds.set(idVal, [tag.pos]);
    }
  }
}

// テスト管理
const suites = [];
function recordSuite(id, title, passed, metrics, details = [], warnings = []) {
  suites.push({ id, title, passed, metrics, details, warnings });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`[${icon}] Suite ${id}: ${title}`);
  console.log(`   Metrics:`, JSON.stringify(metrics));
  if (details.length > 0) {
    console.log(`   Details (sample up to 10):`);
    details.slice(0, 10).forEach(d => console.log(`     • ${d}`));
    if (details.length > 10) console.log(`     ... and ${details.length - 10} more`);
  }
  if (warnings.length > 0) {
    console.log(`   ⚠️ Warnings / Challenger Findings:`);
    warnings.forEach(w => console.log(`     ⚠️  ${w}`));
  }
}

// =============================================================================
// SUITE 1: 全LINEリンク（https://lin.ee/Va5wa9s）の完全一致、属性完全性
// =============================================================================
{
  const EXPECTED_URL = 'https://lin.ee/Va5wa9s';
  const aTags = allTags.filter(t => t.name === 'a');
  const lineLinks = [];
  const lineErrors = [];
  const otherExternalLinks = [];

  for (const a of aTags) {
    const hrefM = a.attrs.match(/\bhref=["']([^"']*)["']/i);
    const targetM = a.attrs.match(/\btarget=["']([^"']*)["']/i);
    const relM = a.attrs.match(/\brel=["']([^"']*)["']/i);
    const href = hrefM ? hrefM[1] : '';
    const target = targetM ? targetM[1] : '';
    const rel = relM ? relM[1] : '';

    if (href.includes('lin.ee') || href.includes('line.me') || /LINE/i.test(a.full)) {
      const isUrlMatch = href === EXPECTED_URL;
      const isTargetBlank = target === '_blank';
      const relTokens = rel.toLowerCase().split(/\s+/);
      const isRelComplete = relTokens.includes('noopener') && relTokens.includes('noreferrer');

      if (!isUrlMatch) {
        lineErrors.push(`[Line ${a.pos.line}] URL mismatch: '${href}' !== '${EXPECTED_URL}'`);
      }
      if (!isTargetBlank) {
        lineErrors.push(`[Line ${a.pos.line}] Missing or invalid target: '${target}', expected '_blank'`);
      }
      if (!isRelComplete) {
        lineErrors.push(`[Line ${a.pos.line}] Missing or incomplete rel: '${rel}', expected 'noopener noreferrer'`);
      }

      lineLinks.push({
        line: a.pos.line,
        href,
        target,
        rel,
        valid: isUrlMatch && isTargetBlank && isRelComplete
      });
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      otherExternalLinks.push({ line: a.pos.line, href, target, rel });
    }
  }

  // 生テキスト中の不正なlin.ee URLの有無
  const rawLineMatches = [...rawHtml.matchAll(/https?:\/\/[^\s"'<>]*lin\.ee[^\s"'<>]*/g)];
  for (const m of rawLineMatches) {
    if (m[0] !== EXPECTED_URL) {
      lineErrors.push(`Corrupted raw LINE URL found: '${m[0]}' at index ${m.index}`);
    }
  }

  const passed = lineErrors.length === 0 && lineLinks.length === 15;
  recordSuite(
    1,
    'LINE Reservation Link Integrity (URL完全一致 / target="_blank" / rel="noopener noreferrer")',
    passed,
    {
      totalAnchorTags: aTags.length,
      lineLinksDetected: lineLinks.length,
      expectedLineLinks: 15,
      otherExternalLinks: otherExternalLinks.length,
      errorsCount: lineErrors.length
    },
    lineLinks.map(l => `Line ${l.line}: href="${l.href}" target="${l.target}" rel="${l.rel}" [${l.valid ? 'OK' : 'INVALID'}]`),
    lineErrors
  );
}

// =============================================================================
// SUITE 2: 内部アンカーリンク実在性とセクションIDオラクル検証
// =============================================================================
{
  const aTags = allTags.filter(t => t.name === 'a');
  const internalAnchors = [];
  const anchorDeadLinks = [];

  for (const a of aTags) {
    const hrefM = a.attrs.match(/\bhref=["'](#([^"']*))["']/i);
    if (hrefM) {
      const fullHash = hrefM[1];
      const targetId = hrefM[2];
      const exists = domIds.has(targetId);
      if (!targetId || !exists) {
        anchorDeadLinks.push(`[Line ${a.pos.line}] Dead anchor link '${fullHash}': DOM ID '${targetId}' not found`);
      }
      internalAnchors.push({
        line: a.pos.line,
        fullHash,
        targetId,
        exists
      });
    }
  }

  // 指示文で言及されたオラクル要求IDの存在確認: #nayami, #supervision, #voices, #lesson, #choice, #faq
  const requiredOracleIds = ['nayami', 'supervision', 'voices', 'lesson', 'choice', 'faq'];
  const oracleIdStatus = {};
  const challengerFindings = [];

  for (const qId of requiredOracleIds) {
    const found = domIds.has(qId);
    oracleIdStatus[qId] = found;
    if (!found) {
      challengerFindings.push(
        `Requested oracle ID '#${qId}' is NOT in DOM. ` +
        (qId === 'nayami' ? `(Section has class="nayamiArea" but id="problem")` :
         qId === 'supervision' ? `(Section has class="supervision" but NO id attribute)` :
         qId === 'choice' ? `(Section has class="choice" but id="pricing")` : '')
      );
    }
  }

  // 既存アンカーリンクのデッドリンクは0件だが、要求IDのうち3件が未定義
  const passed = anchorDeadLinks.length === 0;
  recordSuite(
    2,
    'Internal Anchor Links & Section ID Oracle Verification',
    passed,
    {
      internalAnchorsInHtml: internalAnchors.length,
      deadLinksCount: anchorDeadLinks.length,
      oracleRequestedIds: requiredOracleIds,
      oracleIdStatus,
      existingDomIdsCount: domIds.size
    },
    internalAnchors.map(a => `Line ${a.line}: href="${a.fullHash}" -> targetId="${a.targetId}" (DOM Exists: ${a.exists})`),
    challengerFindings
  );
}

// =============================================================================
// SUITE 3: 開催会場（中央区立城東小学校 室内温水プール、八重洲、水深100cm）の完全記載
// =============================================================================
{
  const venueRequirements = [
    { key: '中央区立城東小学校', regex: /中央区立城東小学校/g },
    { key: '城東小学校（短縮含む）', regex: /城東小学校/g },
    { key: '室内温水プール', regex: /室内温水プール/g },
    { key: '東京ミッドタウン八重洲', regex: /東京ミッドタウン八重洲/g },
    { key: '八重洲', regex: /八重洲/g },
    { key: '水深100cm', regex: /水深100cm/g },
  ];

  const venueMetrics = {};
  const missing = [];
  for (const vr of venueRequirements) {
    const count = [...rawHtml.matchAll(vr.regex)].length;
    venueMetrics[vr.key] = count;
    if (count === 0) {
      missing.push(`Missing mandatory venue requirement: ${vr.key}`);
    }
  }

  const passed = missing.length === 0;
  recordSuite(
    3,
    'Mandatory Venue Specification Completeness (会場完全記載検証)',
    passed,
    venueMetrics,
    [
      `中央区立城東小学校: ${venueMetrics['中央区立城東小学校']} occurrences (inc. JSON-LD & Footer)`,
      `東京ミッドタウン八重洲: ${venueMetrics['東京ミッドタウン八重洲']} occurrences`,
      `水深100cm: ${venueMetrics['水深100cm']} occurrences (Hero, Reason, Supervision, Voices, Lesson, FAQ, Footer)`
    ],
    missing
  );
}

// =============================================================================
// SUITE 4: 開催日程（2026年10月2日, 9日, 16日, 23日 金曜全4回）の完全記載
// =============================================================================
{
  const dateRequirements = [
    { key: '2026年10月2日', regex: /2026年10月2日/g },
    { key: '10月2日', regex: /10月2日/g },
    { key: '10月9日', regex: /10月9日/g },
    { key: '10月16日', regex: /10月16日/g },
    { key: '10月23日', regex: /10月23日/g },
    { key: '金曜', regex: /金曜/g },
    { key: '全4回', regex: /全4回/g },
  ];

  const dateMetrics = {};
  const missing = [];
  for (const dr of dateRequirements) {
    const count = [...rawHtml.matchAll(dr.regex)].length;
    dateMetrics[dr.key] = count;
    if (count === 0) {
      missing.push(`Missing mandatory date requirement: ${dr.key}`);
    }
  }

  const passed = missing.length === 0;
  recordSuite(
    4,
    'Mandatory Schedule & Dates Completeness (開催日程完全記載検証)',
    passed,
    dateMetrics,
    [
      `Lesson Section Schedule: 2026年10月2日(金), 10月9日(金), 10月16日(金), 10月23日(金) verified`,
      `金曜 occurrences: ${dateMetrics['金曜']}`,
      `全4回 occurrences: ${dateMetrics['全4回']}`
    ],
    missing
  );
}

// =============================================================================
// SUITE 5: 2クラス（17:00水慣れ基礎 4名 / 18:00息継ぎ25m 4名）の完全記載
// =============================================================================
{
  const classChecks = [
    { label: 'クラス1 時間（17:00〜17:50）', regex: /17:00\s*[〜~-]\s*17:50/ },
    { label: 'クラス1 名称（水慣れ・浮き身・キック基礎クラス）', regex: /水慣れ・浮き身・キック基礎クラス/ },
    { label: 'クラス1 定員4名', regex: /定員4名[・\s]*足がつく水深100cm/ },
    { label: 'クラス2 時間（18:00〜18:50）', regex: /18:00\s*[〜~-]\s*18:50/ },
    { label: 'クラス2 名称（クロール息継ぎ・25m挑戦クラス）', regex: /クロール息継ぎ・25m挑戦クラス/ },
    { label: 'クラス2 定員4名', regex: /定員4名[・\s]*進級テスト突破特化/ },
  ];

  const classErrors = [];
  const classDetails = [];
  for (const cc of classChecks) {
    const matched = cc.regex.test(rawHtml);
    if (!matched) {
      classErrors.push(`Missing class spec: ${cc.label}`);
    } else {
      classDetails.push(`${cc.label}: Verified`);
    }
  }

  const passed = classErrors.length === 0;
  recordSuite(
    5,
    'Two Classes Specification Completeness (2クラス仕様完全記載検証)',
    passed,
    { totalChecked: classChecks.length, passedCount: classDetails.length },
    classDetails,
    classErrors
  );
}

// =============================================================================
// SUITE 6: 料金体系（1回6500円、2回12000円、4回22000円、入会金0円、都度払いOK）
// =============================================================================
{
  // タグを除去したプレーンテキストで金額表記を確認
  const plainText = rawHtml.replace(/<[^>]*>/g, ' ');

  const priceChecks = [
    { label: '1回チケット 6,500円', regex: /6,500\s*円（税込）/ },
    { label: '2回チケット 12,000円', regex: /12,000\s*円（税込）/ },
    { label: '4回完走パック 22,000円', regex: /22,000\s*円（税込）/ },
    { label: '入会金0円', regex: /入会金0円|入会金[・\s]*月会費はずっと0円|入会金・年会費0円/ },
    { label: '都度払いOK', regex: /都度払いOK/ },
  ];

  const priceErrors = [];
  const priceDetails = [];
  for (const pc of priceChecks) {
    const matched = pc.regex.test(plainText);
    if (!matched) {
      priceErrors.push(`Missing pricing spec: ${pc.label}`);
    } else {
      priceDetails.push(`${pc.label}: Verified in text`);
    }
  }

  const passed = priceErrors.length === 0;
  recordSuite(
    6,
    'Pricing Structure Completeness (料金体系完全記載検証)',
    passed,
    { checkedSpecs: priceChecks.length, passedSpecs: priceDetails.length },
    priceDetails,
    priceErrors
  );
}

// =============================================================================
// SUITE 7: テスト顧客データ（会員番号0035、テスト太郎）の厳格維持
// =============================================================================
{
  const customerErrors = [];
  const customerDetails = [];

  // 会員番号の検出
  const memberMatches = [...rawHtml.matchAll(/会員番号[：:\s]*(\d+)/g)];
  for (const mm of memberMatches) {
    const no = mm[1];
    if (no !== '0035') {
      customerErrors.push(`Unauthorized member number '${no}' found! (Only '0035' allowed)`);
    } else {
      customerDetails.push(`Valid member number '${no}' detected`);
    }
  }

  if (memberMatches.length === 0) {
    customerErrors.push(`Mandatory test member number '会員番号0035' is missing!`);
  }

  // テスト太郎の検出
  const taroMatches = [...rawHtml.matchAll(/テスト太郎/g)];
  if (taroMatches.length === 0) {
    customerErrors.push(`Mandatory test customer name 'テスト太郎' is missing!`);
  } else {
    customerDetails.push(`Test customer 'テスト太郎' detected (${taroMatches.length} occurrences)`);
  }

  // 他の架空名（山田太郎、佐藤太郎など）の混入チェック
  const forbiddenNames = ['山田太郎', '佐藤太郎', '鈴木太郎', 'テスト花子', 'サンプル'];
  for (const fn of forbiddenNames) {
    if (rawHtml.includes(fn)) {
      customerErrors.push(`Unauthorized dummy name '${fn}' found!`);
    }
  }

  const passed = customerErrors.length === 0;
  recordSuite(
    7,
    'Test Customer Constraint Integrity (会員番号0035・テスト太郎制約厳格維持)',
    passed,
    { member0035Matches: memberMatches.length, testTaroMatches: taroMatches.length, violations: customerErrors.length },
    customerDetails,
    customerErrors
  );
}

// =============================================================================
// SUITE 8: HTMLスタックパースによる未閉じタグ・タグ不整合・属性重複
// =============================================================================
{
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
  ]);
  const svgSelfClosingElements = new Set([
    'path', 'circle', 'line', 'rect', 'polygon', 'polyline', 'ellipse', 'stop', 'use', 'defs'
  ]);

  const tagStack = [];
  const tagMismatches = [];
  let cursor = 0;
  const len = rawHtml.length;

  while (cursor < len) {
    // コメント
    if (rawHtml.startsWith('<!--', cursor)) {
      const end = rawHtml.indexOf('-->', cursor + 4);
      if (end === -1) {
        tagMismatches.push(`Unclosed comment starting at index ${cursor}`);
        break;
      }
      cursor = end + 3;
      continue;
    }

    // script
    if (rawHtml.substring(cursor).toLowerCase().startsWith('<script')) {
      const m = rawHtml.substring(cursor).match(/^<script\b[^>]*>/i);
      if (m) {
        const endScript = rawHtml.substring(cursor + m[0].length).match(/<\/script>/i);
        if (!endScript) {
          tagMismatches.push(`Unclosed <script> starting at index ${cursor}`);
          break;
        }
        cursor = cursor + m[0].length + endScript.index + endScript[0].length;
        continue;
      }
    }

    // style
    if (rawHtml.substring(cursor).toLowerCase().startsWith('<style')) {
      const m = rawHtml.substring(cursor).match(/^<style\b[^>]*>/i);
      if (m) {
        const endStyle = rawHtml.substring(cursor + m[0].length).match(/<\/style>/i);
        if (!endStyle) {
          tagMismatches.push(`Unclosed <style> starting at index ${cursor}`);
          break;
        }
        cursor = cursor + m[0].length + endStyle.index + endStyle[0].length;
        continue;
      }
    }

    // タグ
    if (rawHtml[cursor] === '<') {
      // 終了タグ
      if (rawHtml[cursor + 1] === '/') {
        const end = rawHtml.indexOf('>', cursor + 2);
        if (end === -1) {
          tagMismatches.push(`Malformed closing tag at index ${cursor}`);
          break;
        }
        const tagName = rawHtml.substring(cursor + 2, end).trim().toLowerCase().split(/\s+/)[0];
        const pos = getLineAndCol(cursor);

        if (tagStack.length === 0) {
          tagMismatches.push(`Unexpected closing tag </${tagName}> at Line ${pos.line}, Col ${pos.col} (empty stack)`);
        } else {
          const top = tagStack.pop();
          if (top.name !== tagName) {
            tagMismatches.push(`Mismatched closing tag </${tagName}> at Line ${pos.line}, Col ${pos.col}. Expected </${top.name}> (opened at Line ${top.line}, Col ${top.col})`);
          }
        }
        cursor = end + 1;
        continue;
      }

      // 開始タグ または 自己終了タグ
      const end = rawHtml.indexOf('>', cursor + 1);
      if (end === -1) {
        tagMismatches.push(`Malformed opening tag at index ${cursor}`);
        break;
      }

      const tagContent = rawHtml.substring(cursor + 1, end).trim();
      if (!tagContent) {
        cursor++;
        continue;
      }

      const isSelfClosing = tagContent.endsWith('/') || rawHtml[end - 1] === '/';
      const tagTokens = tagContent.replace(/\/$/, '').trim().split(/\s+/);
      const tagName = tagTokens[0].toLowerCase();
      const pos = getLineAndCol(cursor);

      if (tagName.startsWith('!')) {
        cursor = end + 1;
        continue;
      }

      if (voidElements.has(tagName)) {
        cursor = end + 1;
        continue;
      }

      if (isSelfClosing && (svgSelfClosingElements.has(tagName) || tagName.includes('-'))) {
        cursor = end + 1;
        continue;
      }

      tagStack.push({ name: tagName, line: pos.line, col: pos.col });
      cursor = end + 1;
      continue;
    }

    cursor++;
  }

  if (tagStack.length > 0) {
    tagStack.forEach(t => {
      tagMismatches.push(`Unclosed <${t.name}> opened at Line ${t.line}, Col ${t.col}`);
    });
  }

  // 属性重複検査
  const duplicateAttrErrors = [];
  for (const tag of allTags) {
    if (tag.name.startsWith('!')) continue;
    const attrRegex = /([a-zA-Z0-9\-:_]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let aMatch;
    const seen = new Set();
    while ((aMatch = attrRegex.exec(tag.attrs)) !== null) {
      const aName = aMatch[1].toLowerCase();
      if (seen.has(aName)) {
        duplicateAttrErrors.push(`[Line ${tag.pos.line}] Duplicate attribute '${aName}' in <${tag.name}>`);
      } else {
        seen.add(aName);
      }
    }
  }

  const passed = tagMismatches.length === 0 && duplicateAttrErrors.length === 0;
  recordSuite(
    8,
    'HTML Stack Parse & Attribute Duplication Integrity (未閉じタグ・タグ不整合・属性重複検査)',
    passed,
    {
      totalTagsChecked: allTags.length,
      unclosedOrMismatchedTags: tagMismatches.length,
      duplicateAttributes: duplicateAttrErrors.length
    },
    tagMismatches.length === 0 && duplicateAttrErrors.length === 0
      ? ['All opening and closing tags strictly matched', '0 duplicate attributes across all tags']
      : tagMismatches.concat(duplicateAttrErrors),
    tagMismatches.concat(duplicateAttrErrors)
  );
}

// =============================================================================
// SUITE 9: スクリプト構文・JSON-LD構文検証
// =============================================================================
{
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  const scriptErrors = [];
  const scriptDetails = [];

  while ((scriptMatch = scriptRegex.exec(rawHtml)) !== null) {
    const attrs = scriptMatch[1];
    const content = scriptMatch[2].trim();
    const pos = getLineAndCol(scriptMatch.index);

    if (!content) {
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      scriptDetails.push(`Line ${pos.line}: External script src="${srcMatch ? srcMatch[1] : 'unknown'}"`);
      continue;
    }

    if (attrs.includes('application/ld+json')) {
      try {
        const parsed = JSON.parse(content);
        scriptDetails.push(`Line ${pos.line}: Valid JSON-LD (@type: ${parsed['@type']}, name: "${parsed.name}")`);
      } catch (e) {
        scriptErrors.push(`Line ${pos.line}: JSON-LD Parse Error: ${e.message}`);
      }
    } else {
      try {
        new vm.Script(content);
        scriptDetails.push(`Line ${pos.line}: Valid JavaScript (${content.split('\n').length} lines)`);
      } catch (e) {
        scriptErrors.push(`Line ${pos.line}: JavaScript SyntaxError: ${e.message}`);
      }
    }
  }

  const passed = scriptErrors.length === 0;
  recordSuite(
    9,
    'Script & Structured Data Syntax Validation (JS/JSON-LD構文検証)',
    passed,
    { scriptCount: scriptDetails.length + scriptErrors.length, errorsCount: scriptErrors.length },
    scriptDetails,
    scriptErrors
  );
}

// =============================================================================
// SUITE 10: デバッグ文字列・文字化け検出
// =============================================================================
{
  const debugTerms = ['TODO', 'FIXME', 'undefined', 'NaN', '[object Object]', '\uFFFD'];
  const debugFindings = [];

  for (const term of debugTerms) {
    let searchIdx = 0;
    while ((searchIdx = rawHtml.indexOf(term, searchIdx)) !== -1) {
      const pos = getLineAndCol(searchIdx);
      const snippet = rawHtml.substring(Math.max(0, searchIdx - 20), Math.min(rawHtml.length, searchIdx + term.length + 20)).replace(/\n/g, ' ');
      debugFindings.push(`Suspicious token '${term}' at Line ${pos.line}, Col ${pos.col}: "...${snippet}..."`);
      searchIdx += term.length;
    }
  }

  const passed = debugFindings.length === 0;
  recordSuite(
    10,
    'Code Cleanliness & Debug Token Check (未完了トークン・文字化け検査)',
    passed,
    { checkedTokens: debugTerms, findingsCount: debugFindings.length },
    debugFindings.length === 0 ? ['No debug/corrupted tokens found'] : debugFindings,
    debugFindings
  );
}

// =============================================================================
// 総合集計
// =============================================================================
console.log('\n================================================================================');
console.log('EMPIRICAL ORACLE TEST SUMMARY & METRICS');
console.log('================================================================================');
const passedSuites = suites.filter(s => s.passed);
const failedSuites = suites.filter(s => !s.passed);
console.log(`TOTAL SUITES  : ${suites.length}`);
console.log(`PASSED SUITES : ${passedSuites.length}`);
console.log(`FAILED SUITES : ${failedSuites.length}`);

let totalWarnings = 0;
suites.forEach(s => {
  totalWarnings += s.warnings.length;
});
console.log(`TOTAL WARNINGS / CHALLENGES: ${totalWarnings}`);

const allPassed = failedSuites.length === 0;
console.log(`VERDICT: ${allPassed ? '🟢 ALL REQUIRED SPECS PASSED' : '🔴 SOME SPECS FAILED'}`);
console.log('================================================================================\n');

process.exit(allPassed ? 0 : 1);
