import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 8899;
const server = http.createServer((req, res) => {
  const parsedUrl = req.url.split('?')[0];
  const filePath = path.join(process.cwd(), 'public', parsedUrl === '/' ? 'swim-step-lp-school.html' : parsedUrl);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found: ' + filePath);
  }
});

server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`[CHALLENGER TEST SUITE] Starting on http://127.0.0.1:${PORT}`);
  console.log(`=======================================================`);
  
  const chromeProfileDir = `/tmp/chrome_challenger_profile_${Date.now()}`;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${chromeProfileDir}`,
    '--disable-gpu',
    'about:blank'
  ]);

  const report = {
    testSuite: 'teamwork_preview_challenger_2 Empirical Verification',
    timestamp: new Date().toISOString(),
    environment: {
      browser: 'Google Chrome 153.0.8010.53 (Headless)',
      runtime: process.version,
      platform: process.platform,
      targetFile: 'public/swim-step-lp-school.html'
    },
    sections: {
      viewportOverflow: null,
      faqAccordion: null,
      followingBar: null,
      footerOverlap: null,
      anchorNavigation: null,
      customerConstraint: null,
      jsConsoleErrors: null,
      htmlSyntaxCheck: null
    },
    overallVerdict: 'PENDING'
  };

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 150));
      try {
        const res = await fetch('http://127.0.0.1:9222/json/version');
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch (e) {}
    }

    if (!wsUrl) throw new Error('Chrome failed to expose WebSocket debugging endpoint.');

    const targetRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const targetData = await targetRes.json();
    const ws = new WebSocket(targetData.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();
    const jsExceptions = [];
    const consoleErrors = [];
    const networkErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        jsExceptions.push(msg.params);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params);
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        if (msg.params.entry.source === 'network') {
          networkErrors.push(msg.params.entry);
        } else {
          consoleErrors.push(msg.params.entry);
        }
      }
    };

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, (res) => {
        if (res.error) reject(new Error(JSON.stringify(res.error)));
        else resolve(res.result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(resolve => ws.onopen = resolve);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');

    console.log('[1/7] Navigating to LP and awaiting initial layout...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/swim-step-lp-school.html` });
    // Wait for fonts & Tailwind compilation
    await new Promise(r => setTimeout(r, 2500));

    // -------------------------------------------------------------
    // SECTION 1: 多画面ビューポート横スクロール検証（6種指定 + 2種境界値）
    // -------------------------------------------------------------
    console.log('\n[2/7] Testing Viewports & Horizontal Overflow...');
    const viewports = [
      { name: 'iPhone SE (375px)', width: 375, height: 667, dpr: 2, mobile: true, group: 'REQUIRED' },
      { name: 'iPhone 14/15 Pro Max (430px)', width: 430, height: 932, dpr: 3, mobile: true, group: 'REQUIRED' },
      { name: 'iPad Portrait (768px)', width: 768, height: 1024, dpr: 2, mobile: false, group: 'REQUIRED' },
      { name: 'iPad Pro / Landscape (1024px)', width: 1024, height: 1366, dpr: 2, mobile: false, group: 'REQUIRED' },
      { name: 'MacBook / Desktop (1280px)', width: 1280, height: 800, dpr: 1, mobile: false, group: 'REQUIRED' },
      { name: 'Full HD Desktop (1920px)', width: 1920, height: 1080, dpr: 1, mobile: false, group: 'REQUIRED' },
      { name: 'Compact Android (360px)', width: 360, height: 740, dpr: 2, mobile: true, group: 'STRESS' },
      { name: 'iPhone 5/SE初代 (320px)', width: 320, height: 568, dpr: 2, mobile: true, group: 'STRESS' },
    ];

    const vpResults = [];
    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.dpr,
        mobile: vp.mobile
      });
      await new Promise(r => setTimeout(r, 350));

      const res = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const de = document.documentElement;
            const b = document.body;
            const clientWidth = de.clientWidth;
            const scrollWidth = de.scrollWidth;
            const bodyScrollWidth = b.scrollWidth;
            const innerWidth = window.innerWidth;
            
            const overflowing = [];
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const r = el.getBoundingClientRect();
              if (r.right > clientWidth + 0.5) {
                overflowing.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || null,
                  className: (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 3).join(' ') : '',
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                  overflowPx: Math.round(r.right - clientWidth)
                });
              }
            }
            
            return {
              clientWidth,
              scrollWidth,
              bodyScrollWidth,
              innerWidth,
              hasHorizontalScroll: scrollWidth > clientWidth,
              overflowingCount: overflowing.length,
              topOverflowing: overflowing.slice(0, 3)
            };
          })()
        `,
        returnByValue: true
      });

      const data = res.result.value;
      const pass = !data.hasHorizontalScroll && (data.scrollWidth <= data.clientWidth);
      vpResults.push({
        group: vp.group,
        name: vp.name,
        width: vp.width,
        height: vp.height,
        measured: data,
        status: pass ? 'PASS' : 'FAIL'
      });
      console.log(`  - [${pass ? 'PASS' : 'FAIL'}] ${vp.name.padEnd(35)} : clientWidth=${data.clientWidth}px, scrollWidth=${data.scrollWidth}px, innerWidth=${data.innerWidth}px, scroll=${data.hasHorizontalScroll ? 'YES' : 'NO'}`);
    }

    report.sections.viewportOverflow = {
      totalTested: vpResults.length,
      allPassed: vpResults.every(r => r.status === 'PASS'),
      details: vpResults
    };

    // -------------------------------------------------------------
    // SECTION 2: FAQアコーディオン開閉動作＆JS検証
    // -------------------------------------------------------------
    console.log('\n[3/7] Testing FAQ Accordion interactions & stress clicks...');
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
    await new Promise(r => setTimeout(r, 200));

    const faqRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const items = Array.from(document.querySelectorAll('#faq details'));
          const results = [];
          
          for (let i = 0; i < items.length; i++) {
            const d = items[i];
            const s = d.querySelector('summary');
            const q = s ? s.innerText.replace(/\\n/g, ' ').trim() : '';
            
            const initOpen = d.open;
            s.click();
            const opened = d.open;
            const p = d.querySelector('p');
            const pVisible = p && p.getBoundingClientRect().height > 0;
            
            s.click();
            const closed = d.open;
            
            // Rapid 6 clicks stress test
            for (let k = 0; k < 6; k++) s.click();
            const stressState = d.open; // 6 clicks after closed => closed
            
            results.push({
              index: i + 1,
              question: q,
              initOpen,
              opened: opened === true,
              contentVisible: pVisible,
              closed: closed === false,
              stressPassed: stressState === false
            });
          }
          return {
            count: items.length,
            results
          };
        })()
      `,
      returnByValue: true
    });

    const faqData = faqRes.result.value;
    const faqPassed = faqData.count === 5 && faqData.results.every(r => r.opened && r.closed && r.contentVisible && r.stressPassed);
    console.log(`  - Total FAQs: ${faqData.count}, All Interactive & Stress Passed: ${faqPassed}`);
    report.sections.faqAccordion = {
      count: faqData.count,
      status: faqPassed ? 'PASS' : 'FAIL',
      items: faqData.results
    };

    // -------------------------------------------------------------
    // SECTION 3: スマホ追従バー（#following）Safe Area CSS ＆ レスポンシブ表示検証
    // -------------------------------------------------------------
    console.log('\n[4/7] Testing #following bar Safe Area CSS & responsive visibility...');
    
    // Check Mobile 375px
    const fMobRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.getElementById('following');
          if (!el) return { exists: false };
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const html = el.outerHTML;
          return {
            exists: true,
            display: s.display,
            position: s.position,
            bottom: s.bottom,
            zIndex: s.zIndex,
            paddingBottom: s.paddingBottom,
            height: r.height,
            hasSafeAreaMarkup: html.includes('env(safe-area-inset-bottom)'),
            classes: el.className
          };
        })()
      `,
      returnByValue: true
    });
    const fMob = fMobRes.result.value;

    // Check Tablet 768px and Desktop 1024px
    await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 2, mobile: false });
    await new Promise(r => setTimeout(r, 200));
    const fTabRes = await send('Runtime.evaluate', {
      expression: `window.getComputedStyle(document.getElementById('following')).display`,
      returnByValue: true
    });

    await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 2, mobile: false });
    await new Promise(r => setTimeout(r, 200));
    const fDeskRes = await send('Runtime.evaluate', {
      expression: `window.getComputedStyle(document.getElementById('following')).display`,
      returnByValue: true
    });

    const followingPass = fMob.exists &&
      fMob.display !== 'none' &&
      fMob.position === 'fixed' &&
      fMob.hasSafeAreaMarkup &&
      fTabRes.result.value === 'none' &&
      fDeskRes.result.value === 'none';

    console.log(`  - Mobile (375px): display=${fMob.display}, position=${fMob.position}, Safe Area Markup=${fMob.hasSafeAreaMarkup}`);
    console.log(`  - Tablet (768px): display=${fTabRes.result.value} (Expected "none")`);
    console.log(`  - Desktop (1024px): display=${fDeskRes.result.value} (Expected "none")`);
    console.log(`  - Following Bar Status: ${followingPass ? 'PASS' : 'FAIL'}`);

    report.sections.followingBar = {
      mobile: fMob,
      tabletDisplay: fTabRes.result.value,
      desktopDisplay: fDeskRes.result.value,
      status: followingPass ? 'PASS' : 'FAIL'
    };

    // -------------------------------------------------------------
    // SECTION 4: 画面最下部スクロール時のフッター被り防止＆余白検証
    // -------------------------------------------------------------
    console.log('\n[5/7] Testing Footer Clearance and Overlap at Maximum Scroll (375px & 430px)...');
    
    const overlapResults = [];
    for (const mobWidth of [375, 430]) {
      await send('Emulation.setDeviceMetricsOverride', { width: mobWidth, height: mobWidth === 375 ? 667 : 932, deviceScaleFactor: 2, mobile: true });
      await new Promise(r => setTimeout(r, 200));

      const scrollRes = await send('Runtime.evaluate', {
        expression: `
          (async () => {
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, document.documentElement.scrollHeight);
            await new Promise(r => setTimeout(r, 250));
            
            const following = document.getElementById('following');
            const fRect = following.getBoundingClientRect();
            
            const footer = document.getElementById('footer');
            const footerRect = footer.getBoundingClientRect();
            
            const copyright = footer.querySelector('p.text-gray-500, p:last-child');
            const cRect = copyright.getBoundingClientRect();
            
            const wrapper = document.getElementById('wrapper');
            const wStyle = window.getComputedStyle(wrapper);
            
            const isOverlap = cRect.bottom > fRect.top;
            const clearance = fRect.top - cRect.bottom;
            
            return {
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              scrollY: window.scrollY,
              followingTop: Math.round(fRect.top),
              followingHeight: Math.round(fRect.height),
              footerBottom: Math.round(footerRect.bottom),
              copyrightBottom: Math.round(cRect.bottom),
              wrapperPaddingBottom: wStyle.paddingBottom,
              isOverlap,
              clearance: Math.round(clearance * 10) / 10
            };
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      });

      const sData = scrollRes.result.value;
      const pass = !sData.isOverlap && sData.clearance >= 0;
      overlapResults.push({ width: mobWidth, data: sData, status: pass ? 'PASS' : 'FAIL' });
      console.log(`  - Viewport ${mobWidth}px: followingTop=${sData.followingTop}px, copyrightBottom=${sData.copyrightBottom}px, clearance=${sData.clearance}px, overlap=${sData.isOverlap ? 'YES (DEFECT!)' : 'NO (SAFE)'} => [${pass ? 'PASS' : 'FAIL'}]`);
    }

    const allOverlapPass = overlapResults.every(r => r.status === 'PASS');
    report.sections.footerOverlap = {
      results: overlapResults,
      status: allOverlapPass ? 'PASS' : 'FAIL'
    };

    // -------------------------------------------------------------
    // SECTION 5: 顧客制約データ検証（会員番号0035、テスト太郎）
    // -------------------------------------------------------------
    console.log('\n[6/7] Testing Customer Data Constraint (Member 0035, Test Taro)...');
    const customerRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          const has0035 = text.includes('0035');
          const hasTaro = text.includes('テスト太郎');
          const otherMember = text.match(/会員番号(?!0035)\\d+/g) || [];
          const forbidden = ['山田太郎', '山田花子', '佐藤太郎', '佐藤花子', '鈴木一郎', '田中太郎'].filter(n => text.includes(n));
          return {
            has0035,
            hasTaro,
            otherMember,
            forbidden
          };
        })()
      `,
      returnByValue: true
    });
    const cData = customerRes.result.value;
    const customerPass = cData.has0035 && cData.hasTaro && cData.otherMember.length === 0 && cData.forbidden.length === 0;
    console.log(`  - has 0035: ${cData.has0035}, has テスト太郎: ${cData.hasTaro}, forbidden names: ${cData.forbidden.length} => [${customerPass ? 'PASS' : 'FAIL'}]`);
    report.sections.customerConstraint = {
      details: cData,
      status: customerPass ? 'PASS' : 'FAIL'
    };

    // -------------------------------------------------------------
    // SECTION 6: JavaScript実行時エラー・構文エラー検証
    // -------------------------------------------------------------
    console.log('\n[7/7] Checking JavaScript Console & Runtime Exceptions...');
    console.log(`  - Runtime Exceptions: ${jsExceptions.length}`);
    console.log(`  - Console Errors: ${consoleErrors.length}`);
    console.log(`  - Network (Favicon 404): ${networkErrors.length}`);

    const jsPass = jsExceptions.length === 0 && consoleErrors.length === 0;
    report.sections.jsConsoleErrors = {
      exceptions: jsExceptions,
      consoleErrors: consoleErrors,
      networkErrors: networkErrors,
      status: jsPass ? 'PASS' : 'FAIL'
    };

    // -------------------------------------------------------------
    // SECTION 7: HTML構文静的解析（class重複・タグ閉じ）
    // -------------------------------------------------------------
    const rawHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'swim-step-lp-school.html'), 'utf8');
    const duplicateClasses = (rawHtml.match(/class="[^"]*"\s+class=/g) || []).length;
    const tagPairs = ['html','head','body','header','footer','section','div','p','a','span','ul','li','details','summary'];
    const tagDiscrepancies = [];
    for (const tag of tagPairs) {
      const o = (rawHtml.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
      const c = (rawHtml.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
      if (o !== c) tagDiscrepancies.push({ tag, open: o, close: c });
    }
    const syntaxPass = duplicateClasses === 0 && tagDiscrepancies.length === 0;
    report.sections.htmlSyntaxCheck = {
      duplicateClasses,
      tagDiscrepancies,
      status: syntaxPass ? 'PASS' : 'FAIL'
    };

    // -------------------------------------------------------------
    // OVERALL VERDICT
    // -------------------------------------------------------------
    const overall = (
      report.sections.viewportOverflow.allPassed &&
      report.sections.faqAccordion.status === 'PASS' &&
      report.sections.followingBar.status === 'PASS' &&
      report.sections.footerOverlap.status === 'PASS' &&
      report.sections.customerConstraint.status === 'PASS' &&
      report.sections.jsConsoleErrors.status === 'PASS' &&
      report.sections.htmlSyntaxCheck.status === 'PASS'
    ) ? 'PASS' : 'FAIL';

    report.overallVerdict = overall;

    console.log('\n=======================================================');
    console.log(`[CHALLENGER FINAL VERDICT]: >>> ${overall} <<<`);
    console.log(`  1. Viewports Horizontal Overflow (6+2): ${report.sections.viewportOverflow.allPassed ? 'PASS' : 'FAIL'}`);
    console.log(`  2. FAQ Accordion Open/Close & Stress:   ${report.sections.faqAccordion.status}`);
    console.log(`  3. Following Bar Safe Area & Display:   ${report.sections.followingBar.status}`);
    console.log(`  4. Footer Clearance at Max Scroll:      ${report.sections.footerOverlap.status}`);
    console.log(`  5. Customer Constraint (0035/Taro):     ${report.sections.customerConstraint.status}`);
    console.log(`  6. JavaScript Runtime/Console Errors:   ${report.sections.jsConsoleErrors.status}`);
    console.log(`  7. HTML Syntax & Class Attributes:      ${report.sections.htmlSyntaxCheck.status}`);
    console.log('=======================================================\n');

    fs.writeFileSync(path.join(process.cwd(), 'scripts', 'test_results.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log('[OUTPUT] Detailed results written to scripts/test_results.json');

    ws.close();
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    report.overallVerdict = 'FAIL';
    report.fatalError = err.message;
  } finally {
    chrome.kill();
    server.close();
  }
});
