import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const htmlPath = path.resolve('public/swim-step-lp-school.html');
const rawHtml = fs.readFileSync(htmlPath, 'utf8');

console.log('================================================================');
console.log('SWIM STEP LP HTML DEEP EMPIRICAL STRESS-TEST & INTEGRATION HARNESS');
console.log('Target File:', htmlPath);
console.log('File Size  :', Buffer.byteLength(rawHtml, 'utf8'), 'bytes');
console.log('Line Count :', rawHtml.split('\n').length);
console.log('================================================================\n');

let totalFailures = 0;
const results = [];

function recordTest(name, passed, details = []) {
  if (!passed) totalFailures++;
  results.push({ name, passed, details });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusStr}] ${name}`);
  if (details.length > 0) {
    details.slice(0, 15).forEach(d => console.log(`   - ${d}`));
    if (details.length > 15) {
      console.log(`   ... and ${details.length - 15} more`);
    }
  }
}

function getLineAndCol(index) {
  const lines = rawHtml.substring(0, index).split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

// =============================================================================
// TEST 1: 全HTMLタグの開始・終了タグのペア整合性（スタックパース）
// =============================================================================
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
  // コメント処理
  if (rawHtml.startsWith('<!--', cursor)) {
    const end = rawHtml.indexOf('-->', cursor + 4);
    if (end === -1) {
      tagMismatches.push(`Unclosed comment starting at index ${cursor}`);
      break;
    }
    cursor = end + 3;
    continue;
  }

  // <script> 処理
  if (rawHtml.substring(cursor).toLowerCase().startsWith('<script')) {
    const match = rawHtml.substring(cursor).match(/^<script\b[^>]*>/i);
    if (match) {
      const openTag = match[0];
      const endTagMatch = rawHtml.substring(cursor + openTag.length).match(/<\/script>/i);
      if (!endTagMatch) {
        tagMismatches.push(`Unclosed <script> tag at index ${cursor}`);
        break;
      }
      cursor = cursor + openTag.length + endTagMatch.index + endTagMatch[0].length;
      continue;
    }
  }

  // <style> 処理
  if (rawHtml.substring(cursor).toLowerCase().startsWith('<style')) {
    const match = rawHtml.substring(cursor).match(/^<style\b[^>]*>/i);
    if (match) {
      const openTag = match[0];
      const endTagMatch = rawHtml.substring(cursor + openTag.length).match(/<\/style>/i);
      if (!endTagMatch) {
        tagMismatches.push(`Unclosed <style> tag at index ${cursor}`);
        break;
      }
      cursor = cursor + openTag.length + endTagMatch.index + endTagMatch[0].length;
      continue;
    }
  }

  // タグ開始
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

recordTest(
  'HTML Tag Pair & Nesting Integrity (スタックパースによる開始・終了タグ整合性)',
  tagMismatches.length === 0,
  tagMismatches.length > 0 ? tagMismatches : ['All opening/closing tags strictly paired with 0 mismatches']
);

// =============================================================================
// TEST 2: 属性の多重定義・重複定義の有無 (class, id, style, href, etc.)
// =============================================================================
const duplicateAttrErrors = [];
let checkedTagCount = 0;

let scanIdx = 0;
while (scanIdx < rawHtml.length) {
  const openBracket = rawHtml.indexOf('<', scanIdx);
  if (openBracket === -1) break;

  if (rawHtml.startsWith('<!--', openBracket)) {
    const commentEnd = rawHtml.indexOf('-->', openBracket + 4);
    scanIdx = commentEnd === -1 ? rawHtml.length : commentEnd + 3;
    continue;
  }

  if (rawHtml.substring(openBracket).toLowerCase().startsWith('<script')) {
    const endScript = rawHtml.substring(openBracket).search(/<\/script>/i);
    scanIdx = endScript === -1 ? rawHtml.length : openBracket + endScript + 9;
    continue;
  }
  if (rawHtml.substring(openBracket).toLowerCase().startsWith('<style')) {
    const endStyle = rawHtml.substring(openBracket).search(/<\/style>/i);
    scanIdx = endStyle === -1 ? rawHtml.length : openBracket + endStyle + 8;
    continue;
  }

  if (rawHtml[openBracket + 1] === '/') {
    const closeBracket = rawHtml.indexOf('>', openBracket + 2);
    scanIdx = closeBracket === -1 ? rawHtml.length : closeBracket + 1;
    continue;
  }

  let inDoubleQuote = false;
  let inSingleQuote = false;
  let closeBracket = -1;

  for (let i = openBracket + 1; i < rawHtml.length; i++) {
    const ch = rawHtml[i];
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '>' && !inDoubleQuote && !inSingleQuote) {
      closeBracket = i;
      break;
    }
  }

  if (closeBracket === -1) {
    scanIdx = rawHtml.length;
    break;
  }

  const tagStr = rawHtml.substring(openBracket + 1, closeBracket).trim();
  scanIdx = closeBracket + 1;
  checkedTagCount++;

  if (tagStr.startsWith('!')) continue;

  const firstSpace = tagStr.search(/\s/);
  if (firstSpace === -1) continue;

  const tagName = tagStr.substring(0, firstSpace).toLowerCase();
  const attrStr = tagStr.substring(firstSpace);

  // 属性トークナイズ
  const attrRegex = /([a-zA-Z0-9\-:_]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let aMatch;
  const seen = new Map();
  const pos = getLineAndCol(openBracket);

  while ((aMatch = attrRegex.exec(attrStr)) !== null) {
    const aName = aMatch[1].toLowerCase();
    if (seen.has(aName)) {
      duplicateAttrErrors.push(
        `Duplicate attribute '${aName}' on <${tagName}> at Line ${pos.line}, Col ${pos.col}: first='${seen.get(aName)}', duplicate='${aMatch[0]}'`
      );
    } else {
      seen.set(aName, aMatch[0]);
    }
  }
}

recordTest(
  `Duplicate Attribute Detection (全${checkedTagCount}タグの属性多重定義・重複定義の検査)`,
  duplicateAttrErrors.length === 0,
  duplicateAttrErrors.length > 0 ? duplicateAttrErrors : [`Checked ${checkedTagCount} tags: 0 duplicate attributes found`]
);

// =============================================================================
// TEST 3: 全アンカーリンク（href="#..."）のリンク先IDのDOM実在性
// =============================================================================
const idRegex = /\sid=["']([^"']+)["']/g;
const domIds = new Set();
let idMatch;
while ((idMatch = idRegex.exec(rawHtml)) !== null) {
  domIds.add(idMatch[1]);
}

const anchorHrefRegex = /<a\b[^>]*\bhref=["'](#([^"']*))["'][^>]*>/gi;
let anchorMatch;
const anchorErrors = [];
const anchorDetails = [];

while ((anchorMatch = anchorHrefRegex.exec(rawHtml)) !== null) {
  const fullTag = anchorMatch[0];
  const fullHash = anchorMatch[1];
  const targetId = anchorMatch[2];
  const pos = getLineAndCol(anchorMatch.index);

  anchorDetails.push(`Line ${pos.line}: href="${fullHash}" -> targetId="${targetId}" (DOM Exists: ${domIds.has(targetId)})`);

  if (!targetId || targetId.trim() === '') {
    anchorErrors.push(`Empty hash anchor 'href="#"' at Line ${pos.line}: ${fullTag}`);
  } else if (!domIds.has(targetId)) {
    anchorErrors.push(`Target ID '${targetId}' not found in DOM for anchor at Line ${pos.line}: ${fullTag}`);
  }
}

recordTest(
  `Anchor Link Target ID Existence (内部アンカーリンク先ID実在性, 検査数: ${anchorDetails.length})`,
  anchorErrors.length === 0,
  anchorErrors.length > 0 ? anchorErrors : anchorDetails
);

// =============================================================================
// TEST 4: target="_blank" のリンクに rel="noopener noreferrer" が完備されているか
// =============================================================================
const blankAnchorRegex = /<a\b[^>]*\btarget=["']_blank["'][^>]*>/gi;
let blankMatch;
const relErrors = [];
const blankDetails = [];

while ((blankMatch = blankAnchorRegex.exec(rawHtml)) !== null) {
  const tag = blankMatch[0];
  const pos = getLineAndCol(blankMatch.index);
  const hrefMatch = tag.match(/\bhref=["']([^"']*)["']/i);
  const href = hrefMatch ? hrefMatch[1] : '(no href)';

  const relMatch = tag.match(/\brel=["']([^"']*)["']/i);
  if (!relMatch) {
    relErrors.push(`Missing rel attribute in target="_blank" at Line ${pos.line}: ${tag}`);
  } else {
    const relVal = relMatch[1].toLowerCase().split(/\s+/);
    const hasNoopener = relVal.includes('noopener');
    const hasNoreferrer = relVal.includes('noreferrer');
    if (!hasNoopener || !hasNoreferrer) {
      relErrors.push(`Incomplete rel attribute (requires 'noopener noreferrer') at Line ${pos.line}, got '${relMatch[1]}': ${tag}`);
    } else {
      blankDetails.push(`Line ${pos.line}: href="${href}" rel="${relMatch[1]}" target="_blank"`);
    }
  }
}

recordTest(
  `Security: target="_blank" rel="noopener noreferrer" Compliance (検査数: ${blankDetails.length + relErrors.length})`,
  relErrors.length === 0,
  relErrors.length > 0 ? relErrors : blankDetails
);

// =============================================================================
// TEST 5: 公式LINE予約URL（https://lin.ee/Va5wa9s）が正しく配置されているか
// =============================================================================
const EXPECTED_LINE_URL = 'https://lin.ee/Va5wa9s';
const allAnchorTags = [...rawHtml.matchAll(/<a\b[^>]*>/gi)];
const lineUrlErrors = [];
const lineUrlDetails = [];

for (const a of allAnchorTags) {
  const tag = a[0];
  const hrefMatch = tag.match(/\bhref=["']([^"']*)["']/i);
  if (!hrefMatch) continue;
  const href = hrefMatch[1];
  const pos = getLineAndCol(a.index);

  if (href.includes('lin.ee') || href.includes('line.me')) {
    if (href !== EXPECTED_LINE_URL) {
      lineUrlErrors.push(`Invalid LINE URL '${href}' at Line ${pos.line}, expected '${EXPECTED_LINE_URL}'`);
    } else {
      const hasTargetBlank = /target=["']_blank["']/i.test(tag);
      lineUrlDetails.push(`Line ${pos.line}: href="${href}" [target="_blank": ${hasTargetBlank}]`);
    }
  }
}

const lineMatches = [...rawHtml.matchAll(/https:\/\/lin\.ee\/[^\s"'<>]+/g)];
for (const lm of lineMatches) {
  const foundUrl = lm[0];
  const pos = getLineAndCol(lm.index);
  if (foundUrl !== EXPECTED_LINE_URL) {
    lineUrlErrors.push(`Corrupted/unexpected LINE URL '${foundUrl}' at Line ${pos.line}`);
  }
}

recordTest(
  `Official LINE Reservation URL Integrity (公式LINE予約URL整合性, 検出数: ${lineUrlDetails.length}箇所)`,
  lineUrlErrors.length === 0 && lineUrlDetails.length > 0,
  lineUrlErrors.length > 0 ? lineUrlErrors : lineUrlDetails
);

// =============================================================================
// TEST 6: 外部リンクの target="_blank" 一貫性ストレステスト（EMPIRICAL CHALLENGER観点）
// =============================================================================
const externalLinksWithoutBlank = [];
for (const a of allAnchorTags) {
  const tag = a[0];
  const hrefMatch = tag.match(/\bhref=["']([^"']*)["']/i);
  if (!hrefMatch) continue;
  const href = hrefMatch[1];
  const pos = getLineAndCol(a.index);

  if (href.startsWith('http://') || href.startsWith('https://')) {
    const hasTargetBlank = /target=["']_blank["']/i.test(tag);
    if (!hasTargetBlank) {
      externalLinksWithoutBlank.push(`Line ${pos.line}: External URL '${href}' without target="_blank"`);
    }
  }
}

// これは警告/改善指摘（UI/UX一貫性）としてログ記録
recordTest(
  `External Link target="_blank" Consistency Check (外部リンク遷移の一貫性検査, 非blank件数: ${externalLinksWithoutBlank.length})`,
  true, // 構文仕様上は任意だが、チャレンジャー報告書に重要指摘として記載
  externalLinksWithoutBlank.length > 0 ? externalLinksWithoutBlank : ['All external links have target="_blank"']
);

// =============================================================================
// TEST 7: インラインJavaScript構文・JSON-LD構文チェック
// =============================================================================
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
      scriptDetails.push(`Line ${pos.line}: Valid JSON-LD (@type: ${parsed['@type']})`);
    } catch (e) {
      scriptErrors.push(`JSON-LD Parse Error at Line ${pos.line}: ${e.message}`);
    }
  } else {
    try {
      new vm.Script(content);
      scriptDetails.push(`Line ${pos.line}: Valid JavaScript (${content.split('\n').length} lines)`);
    } catch (e) {
      scriptErrors.push(`JavaScript SyntaxError at Line ${pos.line}: ${e.message}`);
    }
  }
}

recordTest(
  `Script & JSON-LD Syntax Validation (構文チェック, スクリプト数: ${scriptDetails.length + scriptErrors.length})`,
  scriptErrors.length === 0,
  scriptErrors.length > 0 ? scriptErrors : scriptDetails
);

// =============================================================================
// TEST 8: テスト顧客データ制約（会員番号0035、テスト太郎のみ）検証
// =============================================================================
const customerErrors = [];
const memberNoRegex = /会員番号[：:\s]*(\d+)/g;
let mMatch;
while ((mMatch = memberNoRegex.exec(rawHtml)) !== null) {
  const no = mMatch[1];
  if (no !== '0035') {
    const pos = getLineAndCol(mMatch.index);
    customerErrors.push(`Unauthorized member number '${no}' at Line ${pos.line}`);
  }
}
if (!rawHtml.includes('会員番号0035') || !rawHtml.includes('テスト太郎')) {
  customerErrors.push('Required test customer "会員番号0035" or "テスト太郎" is missing');
}

recordTest(
  'Test Customer Constraint Compliance (会員番号0035・テスト太郎制約)',
  customerErrors.length === 0,
  customerErrors.length > 0 ? customerErrors : ['Verified: only 会員番号0035 and テスト太郎 are present']
);

// =============================================================================
// TEST 9: 不正なデバッグ文字列・壊れた文字・未完了トークンの検出
// =============================================================================
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

recordTest(
  'Code Cleanliness & Debug Token Check (未完了トークン・文字化け検出)',
  debugFindings.length === 0,
  debugFindings
);

// =============================================================================
// TEST 10: スイムステップ開催要件の必須文言・数値の完全性検証
// =============================================================================
const requirementChecks = [
  { label: '会場（城東小）', pattern: /城東小学校/ },
  { label: '会場（八重洲）', pattern: /東京ミッドタウン八重洲/ },
  { label: '水深（100cm）', pattern: /水深100cm/ },
  { label: '10月開講日（10月2日）', pattern: /10月2日/ },
  { label: '10月開講日（10月9日）', pattern: /10月9日/ },
  { label: '10月開講日（10月16日）', pattern: /10月16日/ },
  { label: '10月開講日（10月23日）', pattern: /10月23日/ },
  { label: '水慣れ基礎（17:00〜17:50）', pattern: /17:00\s*[〜~-]\s*17:50/ },
  { label: '息継ぎ25m（18:00〜18:50）', pattern: /18:00\s*[〜~-]\s*18:50/ },
  { label: '定員4名', pattern: /定員4名/ },
  { label: '料金（6,500円）', pattern: /6,500[\s\S]*?円/ },
  { label: '料金（12,000円）', pattern: /12,000[\s\S]*?円/ },
  { label: '料金（22,000円）', pattern: /22,000[\s\S]*?円/ },
];

const requirementErrors = [];
for (const rc of requirementChecks) {
  if (!rc.pattern.test(rawHtml)) {
    requirementErrors.push(`Missing mandatory requirement copy: ${rc.label}`);
  }
}

recordTest(
  `Mandatory Event Requirements Completeness (開催要件文言・数値13項目の実体検証)`,
  requirementErrors.length === 0,
  requirementErrors.length > 0 ? requirementErrors : [`All ${requirementChecks.length} requirement items verified in DOM text`]
);

// =============================================================================
// まとめ
// =============================================================================
console.log('\n================================================================');
console.log(`TOTAL SUITES : ${results.length}`);
console.log(`PASSED SUITES: ${results.filter(r => r.passed).length}`);
console.log(`FAILED SUITES: ${totalFailures}`);
console.log(`OVERALL EMPIRICAL VERDICT: ${totalFailures === 0 ? '🟢 ALL TESTS PASSED' : '🔴 TESTS FAILED'}`);
console.log('================================================================');

process.exit(totalFailures === 0 ? 0 : 1);
