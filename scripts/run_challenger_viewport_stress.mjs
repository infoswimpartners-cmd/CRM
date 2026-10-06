import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 8999;
const HTML_PATH = path.join(process.cwd(), 'public', 'swim-step-lp-school.html');

if (!fs.existsSync(HTML_PATH)) {
  console.error(`Target HTML not found: ${HTML_PATH}`);
  process.exit(1);
}

// 簡易ローカル静的ファイルサーバー
const server = http.createServer((req, res) => {
  const parsedUrl = req.url.split('?')[0];
  const filePath = path.join(process.cwd(), 'public', parsedUrl === '/' ? 'swim-step-lp-school.html' : parsedUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html; charset=utf-8' :
                        ext === '.css' ? 'text/css' :
                        ext === '.js' ? 'application/javascript' :
                        ext === '.png' ? 'image/png' :
                        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(HTML_PATH));
  }
});

server.listen(PORT, async () => {
  console.log(`========================================================================`);
  console.log(`[CHALLENGER 1: VIEWPORT & LAYOUT STRESS TEST HARNESS]`);
  console.log(`Server running at http://127.0.0.1:${PORT}`);
  console.log(`========================================================================\n`);

  const chromeProfileDir = `/tmp/chrome_challenger1_profile_${Date.now()}`;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${chromeProfileDir}`,
    '--disable-gpu',
    'about:blank'
  ]);

  const report = {
    testSuite: 'Challenger 1 Multi-Viewport & Layout Stress Test',
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      targetFile: 'public/swim-step-lp-school.html'
    },
    results: {
      viewports: [],
      coachImageStress: {},
      fixedWidthStress: {},
      maxWidthConsistency: {},
      flexStretchAudit: {},
      imageAspectRatios: {},
      faqInteraction: {},
      consoleAndErrors: {}
    },
    verdict: 'PENDING'
  };

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 150));
      try {
        const res = await fetch('http://127.0.0.1:9223/json/version');
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch (e) {}
    }

    if (!wsUrl) throw new Error('Chrome failed to start CDP WebSocket endpoint.');

    const targetRes = await fetch('http://127.0.0.1:9223/json/new?about:blank', { method: 'PUT' });
    const targetData = await targetRes.json();
    const ws = new WebSocket(targetData.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();
    const jsExceptions = [];
    const consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        jsExceptions.push(msg.params);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params);
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

    console.log('[STEP 1] Loading Target Page in Headless Chrome...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/swim-step-lp-school.html` });
    // Wait for Tailwind CDN and font rendering
    await new Promise(r => setTimeout(r, 3000));

    // 全体をスクロールして lazy load された画像や要素をトリガー
    await send('Runtime.evaluate', {
      expression: `window.scrollTo(0, document.body.scrollHeight);`
    });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 0);`
    });
    await new Promise(r => setTimeout(r, 500));

    // =========================================================================
    // ITEM 1: MULTI-VIEWPORT OVERFLOW & LAYOUT STRESS TEST
    // =========================================================================
    console.log('\n[STEP 2] Running Multi-Viewport Overflow & Stress Test...');
    const testViewports = [
      { name: 'Mobile Mini (320px)', width: 320, height: 568, dpr: 2, mobile: true, category: 'STRESS_MIN' },
      { name: 'Mobile Standard (375px)', width: 375, height: 667, dpr: 2, mobile: true, category: 'REQUIRED' },
      { name: 'Mobile Modern (430px)', width: 430, height: 932, dpr: 3, mobile: true, category: 'REQUIRED' },
      { name: 'Tablet Portrait (768px)', width: 768, height: 1024, dpr: 2, mobile: false, category: 'REFERENCE' },
      { name: 'Laptop / Tablet Landscape (1024px)', width: 1024, height: 1366, dpr: 2, mobile: false, category: 'REQUIRED' },
      { name: 'MacBook / Desktop (1280px)', width: 1280, height: 800, dpr: 1, mobile: false, category: 'REQUIRED' },
      { name: 'Large Desktop (1440px)', width: 1440, height: 900, dpr: 1, mobile: false, category: 'REQUIRED' },
      { name: 'Full HD Desktop (1920px)', width: 1920, height: 1080, dpr: 1, mobile: false, category: 'REQUIRED' },
      { name: 'Ultra Wide Desktop (2560px)', width: 2560, height: 1440, dpr: 1, mobile: false, category: 'STRESS_MAX' },
    ];

    for (const vp of testViewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.dpr,
        mobile: vp.mobile
      });
      await new Promise(r => setTimeout(r, 400));

      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const de = document.documentElement;
            const b = document.body;
            const clientWidth = de.clientWidth;
            const scrollWidth = de.scrollWidth;
            const bodyScrollWidth = b.scrollWidth;
            const innerWidth = window.innerWidth;

            const overflowingElements = [];
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const r = el.getBoundingClientRect();
              if (r.right > clientWidth + 0.5) {
                const style = window.getComputedStyle(el);
                overflowingElements.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || '',
                  className: (typeof el.className === 'string') ? el.className.split(' ').slice(0, 4).join(' ') : '',
                  position: style.position,
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
              overflowCount: overflowingElements.length,
              sampleOverflows: overflowingElements
            };
          })()
        `,
        returnByValue: true
      });

      if (evalRes.exceptionDetails) {
        throw new Error('Eval error in Step 2: ' + JSON.stringify(evalRes.exceptionDetails));
      }

      const res = evalRes.result.value;
      const pass = !res.hasHorizontalScroll && (res.scrollWidth <= res.clientWidth);
      report.results.viewports.push({
        ...vp,
        clientWidth: res.clientWidth,
        scrollWidth: res.scrollWidth,
        hasHorizontalScroll: res.hasHorizontalScroll,
        overflowCount: res.overflowCount,
        sampleOverflows: res.sampleOverflows,
        status: pass ? 'PASS' : 'FAIL'
      });
      console.log(`  - [${pass ? 'PASS' : 'FAIL'}] ${vp.name.padEnd(40)}: clientW=${res.clientWidth}px, scrollW=${res.scrollWidth}px, overflowCount=${res.overflowCount}`);
      if (res.sampleOverflows.length > 0) {
        for (const ov of res.sampleOverflows) {
          console.log(`      Overflow el: <${ov.tag}> id="${ov.id}" class="${ov.className}" pos="${ov.position}" right=${ov.right}px (+${ov.overflowPx}px)`);
        }
      }
    }

    // =========================================================================
    // ITEM 2: FIXED WIDTH & OVERFLOW RISK ELEMENTS
    // =========================================================================
    console.log('\n[STEP 3] Analyzing Fixed Width Classes & Elements...');
    const fixedWidthRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const all = document.querySelectorAll('*');
          const fixedWidths = [];
          
          for (const el of all) {
            const cls = (typeof el.className === 'string') ? el.className : '';
            const matches = cls.match(/\\b(?:min-|max-)?w-\\[[^\\]]+\\]/g) || [];
            const wProp = el.style.width || '';
            const minWProp = el.style.minWidth || '';

            if (matches.length > 0 || wProp || minWProp) {
              const r = el.getBoundingClientRect();
              fixedWidths.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                classes: matches.join(' '),
                rawClasses: cls.split(' ').slice(0, 4).join(' '),
                inlineWidth: wProp,
                inlineMinWidth: minWProp,
                computedWidth: Math.round(r.width)
              });
            }
          }
          return {
            totalFixedFound: fixedWidths.length,
            fixedWidths
          };
        })()
      `,
      returnByValue: true
    });
    report.results.fixedWidthStress = fixedWidthRes.result.value;
    console.log(`  Found ${fixedWidthRes.result.value.totalFixedFound} elements with explicit w-[...] / min-w / max-w styles.`);

    // =========================================================================
    // ITEM 3: MAX-W-[1200PX] OUTER WRAPPER CONSISTENCY
    // =========================================================================
    console.log('\n[STEP 4] Auditing max-w-[1200px] Container Consistency...');
    const maxWidthRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sections = Array.from(document.querySelectorAll('header, section, footer'));
          const audits = [];

          sections.forEach((sec, idx) => {
            const tag = sec.tagName.toLowerCase();
            const secClass = typeof sec.className === 'string' ? sec.className : '';
            const secId = sec.id || '';
            
            // 外枠コンテナを探す
            const divs = Array.from(sec.querySelectorAll('div'));
            const maxWDivs = divs.filter(d => {
              const c = typeof d.className === 'string' ? d.className : '';
              return c.includes('max-w-[1200px]');
            });

            const hasMaxW1200 = maxWDivs.length > 0;
            const containerClass = hasMaxW1200 ? maxWDivs[0].className.slice(0, 70) : (divs[0] ? divs[0].className.slice(0, 70) : '');

            audits.push({
              index: idx + 1,
              tag,
              secId,
              secClass: secClass.slice(0, 40),
              hasMaxW1200,
              containerClass
            });
          });

          return {
            totalSections: sections.length,
            withMaxW1200: audits.filter(a => a.hasMaxW1200).length,
            audits
          };
        })()
      `,
      returnByValue: true
    });
    report.results.maxWidthConsistency = maxWidthRes.result.value;
    console.log(`  Total Sections Audited: ${maxWidthRes.result.value.totalSections}`);
    console.log(`  Sections with max-w-[1200px] main container: ${maxWidthRes.result.value.withMaxW1200} / ${maxWidthRes.result.value.totalSections}`);

    // =========================================================================
    // ITEM 4: FLEX STRETCH ARCHITECTURE AUDIT (CARDS)
    // =========================================================================
    console.log('\n[STEP 5] Auditing Card Flex Stretch Architecture...');
    // Viewportを1280pxにしてカードの高さ揃えを物理測定
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 400));

    const cardGroupsAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const groups = [];

          // 1. お悩み3カード (#problem .grid > div)
          const nayamiSec = document.querySelector('#problem') || document.querySelector('.nayamiArea');
          if (nayamiSec) {
            const cards = Array.from(nayamiSec.querySelectorAll('.grid > div'));
            groups.push({ groupName: 'お悩み3カード (Nayami)', cards });
          }

          // 2. 選ばれる4理由カード (#reason)
          const reasonsSec = document.querySelector('#reason') || document.querySelector('.reason');
          if (reasonsSec) {
            const cards = Array.from(reasonsSec.querySelectorAll('.space-y-10 > div'));
            groups.push({ groupName: '選ばれる4理由カード (Reasons)', cards });
          }

          // 3. 3ステップ予約カード (#reservation)
          const scheduleSec = document.querySelector('#reservation') || document.querySelector('.newcta');
          if (scheduleSec) {
            const grid = Array.from(scheduleSec.querySelectorAll('div')).find(d => d.className.includes('grid-cols-1') && d.className.includes('md:grid-cols-3'));
            if (grid) {
              const cards = Array.from(grid.children);
              groups.push({ groupName: '3ステップ予約カード (3-Steps)', cards });
            }
          }

          // 4. 監修3カード (.supervision)
          const supSec = document.querySelector('.supervision');
          if (supSec) {
            const grid = Array.from(supSec.querySelectorAll('div')).find(d => d.className.includes('grid-cols-1') && d.className.includes('md:grid-cols-3'));
            if (grid) {
              const cards = Array.from(grid.children);
              groups.push({ groupName: '3つのこだわりカード (Supervision)', cards });
            }
          }

          // 5. 受講生の声カード (#voices)
          const voiceSec = document.querySelector('#voices') || document.querySelector('.voices');
          if (voiceSec) {
            const grid = Array.from(voiceSec.querySelectorAll('div')).find(d => d.className.includes('grid-cols-1') && d.className.includes('md:grid-cols-3'));
            if (grid) {
              const cards = Array.from(grid.children);
              groups.push({ groupName: '受講生の声カード (Voice Reviews)', cards });
            }
          }

          // 6. 開講クラス2カード (#lesson)
          const classesSec = document.querySelector('#lesson') || document.querySelector('.lesson');
          if (classesSec) {
            const grid = Array.from(classesSec.querySelectorAll('div')).find(d => d.className.includes('grid-cols-1') && d.className.includes('md:grid-cols-2'));
            if (grid) {
              const cards = Array.from(grid.children);
              groups.push({ groupName: '開講クラス2カード (Classes)', cards });
            }
          }

          // 7. 料金プラン3カード (#pricing)
          const priceSec = document.querySelector('#pricing') || document.querySelector('.choice');
          if (priceSec) {
            const grid = Array.from(priceSec.querySelectorAll('div')).find(d => d.className.includes('grid-cols-1') && d.className.includes('md:grid-cols-3'));
            if (grid) {
              const cards = Array.from(grid.children);
              groups.push({ groupName: '料金プラン3カード (Pricing)', cards });
            }
          }

          const groupResults = [];

          for (const g of groups) {
            if (!g.cards || g.cards.length === 0) continue;

            const heights = g.cards.map(el => Math.round(el.getBoundingClientRect().height));
            const minH = Math.min(...heights);
            const maxH = Math.max(...heights);
            const heightDiff = maxH - minH;

            const cardsInfo = g.cards.map((el, i) => {
              const cls = typeof el.className === 'string' ? el.className : '';
              const hasHFull = cls.includes('h-full');
              const hasFlex = cls.includes('flex');
              const hasFlexCol = cls.includes('flex-col');
              const hasFlex1 = !!el.querySelector('.flex-1');
              const hasMtAuto = !!el.querySelector('.mt-auto');

              return {
                cardIndex: i + 1,
                hasHFull,
                hasFlex,
                hasFlexCol,
                hasFlex1,
                hasMtAuto,
                height: Math.round(el.getBoundingClientRect().height)
              };
            });

            groupResults.push({
              groupName: g.groupName,
              cardCount: g.cards.length,
              heights,
              heightDiff,
              isHeightEqual: heightDiff <= 2,
              allHaveHFull: cardsInfo.every(c => c.hasHFull),
              allHaveFlexCol: cardsInfo.every(c => c.hasFlexCol),
              cards: cardsInfo
            });
          }

          return groupResults;
        })()
      `,
      returnByValue: true
    });

    if (cardGroupsAudit.exceptionDetails) {
      throw new Error('Eval error in Step 5: ' + JSON.stringify(cardGroupsAudit.exceptionDetails));
    }

    report.results.flexStretchAudit = cardGroupsAudit.result.value || [];
    console.log(`  Audited ${report.results.flexStretchAudit.length} distinct Card Groups for Flex Stretch:`);
    for (const g of report.results.flexStretchAudit) {
      console.log(`    - ${g.groupName.padEnd(38)}: count=${g.cardCount}, Heights=[${g.heights.join(', ')}], Diff=${g.heightDiff}px, h-full=${g.allHaveHFull ? 'YES' : 'NO'}, flex-col=${g.allHaveFlexCol ? 'YES' : 'NO'}, Equal=${g.isHeightEqual ? 'YES' : 'NO'}`);
    }

    // =========================================================================
    // ITEM 5: IMAGE ASPECT RATIO & RENDER SIZING AUDIT
    // =========================================================================
    console.log('\n[STEP 6] Auditing Image Aspect Ratio Coverage & Rendered Sizes...');
    const imageAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          const imgAudits = [];

          imgs.forEach((img, idx) => {
            const cls = typeof img.className === 'string' ? img.className : '';
            const parent = img.parentElement;
            const parentCls = parent && typeof parent.className === 'string' ? parent.className : '';
            
            const selfAspect = cls.match(/aspect-\\[?[a-zA-Z0-9_/]+\\]?/g);
            const parentAspect = parentCls.match(/aspect-\\[?[a-zA-Z0-9_/]+\\]?/g);
            const aspectSpecified = (selfAspect ? selfAspect[0] : null) || (parentAspect ? parentAspect[0] : null);

            const hasObjectCover = cls.includes('object-cover') || parentCls.includes('object-cover');
            const hasWFull = cls.includes('w-full') || parentCls.includes('w-full');
            const hasLoadingLazy = img.getAttribute('loading') === 'lazy';

            const r = img.getBoundingClientRect();

            imgAudits.push({
              index: idx + 1,
              src: img.src.slice(0, 50) + '...',
              alt: img.alt || '',
              aspectSpecified: aspectSpecified || 'NONE',
              hasAspect: !!aspectSpecified,
              hasObjectCover,
              hasWFull,
              hasLoadingLazy,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              complete: img.complete,
              renderedWidth: Math.round(r.width),
              renderedHeight: Math.round(r.height),
              renderedRatio: (r.width > 0 && r.height > 0) ? (r.width / r.height).toFixed(2) : 'N/A'
            });
          });

          const total = imgs.length;
          const withAspect = imgAudits.filter(i => i.hasAspect).length;
          const withCover = imgAudits.filter(i => i.hasObjectCover).length;

          return {
            totalImages: total,
            withAspectCount: withAspect,
            aspectCoveragePct: total > 0 ? Math.round((withAspect / total) * 100) : 100,
            withCoverCount: withCover,
            coverCoveragePct: total > 0 ? Math.round((withCover / total) * 100) : 100,
            images: imgAudits
          };
        })()
      `,
      returnByValue: true
    });

    if (imageAudit.exceptionDetails) {
      throw new Error('Eval error in Step 6: ' + JSON.stringify(imageAudit.exceptionDetails));
    }

    report.results.imageAspectRatios = imageAudit.result.value;
    console.log(`  Total Images Found: ${imageAudit.result.value.totalImages}`);
    console.log(`  Aspect Ratio Specified: ${imageAudit.result.value.withAspectCount} / ${imageAudit.result.value.totalImages} (${imageAudit.result.value.aspectCoveragePct}%)`);
    console.log(`  Object-Cover Specified: ${imageAudit.result.value.withCoverCount} / ${imageAudit.result.value.totalImages} (${imageAudit.result.value.coverCoveragePct}%)`);
    for (const im of imageAudit.result.value.images) {
      console.log(`    - [${im.aspectSpecified.padEnd(16)}] alt="${im.alt.slice(0, 24)}" rendered=${im.renderedWidth}x${im.renderedHeight} (natural=${im.naturalWidth}x${im.naturalHeight}, complete=${im.complete})`);
    }

    // =========================================================================
    // ITEM 6: COACH IMAGE DEEP STRESS AUDIT
    // =========================================================================
    console.log('\n[STEP 7] Investigating Coach Image Container & Sizing Across Viewports...');
    const coachStress = [];
    for (const vp of [{ w: 375, name: '375px Mobile' }, { w: 1024, name: '1024px Laptop' }, { w: 1280, name: '1280px Desktop' }]) {
      await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: 800, deviceScaleFactor: 1, mobile: vp.w < 768 });
      await new Promise(r => setTimeout(r, 300));

      const coachRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const img = document.querySelector('img[alt*="新吉 航大"]');
            if (!img) return null;
            const parent = img.parentElement;
            const r = img.getBoundingClientRect();
            const pr = parent.getBoundingClientRect();
            const comp = window.getComputedStyle(img);
            const pcomp = window.getComputedStyle(parent);
            return {
              viewport: ${vp.w},
              imgWidth: Math.round(r.width),
              imgHeight: Math.round(r.height),
              parentWidth: Math.round(pr.width),
              parentHeight: Math.round(pr.height),
              imgDisplay: comp.display,
              parentDisplay: pcomp.display,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              complete: img.complete
            };
          })()
        `,
        returnByValue: true
      });
      coachStress.push(coachRes.result.value);
      console.log(`  - Coach Img at ${vp.name}: rendered=${coachRes.result.value.imgWidth}x${coachRes.result.value.imgHeight}px, parent=${coachRes.result.value.parentWidth}x${coachRes.result.value.parentHeight}px (natural=${coachRes.result.value.naturalWidth}x${coachRes.result.value.naturalHeight}, complete=${coachRes.result.value.complete})`);
    }
    report.results.coachImageStress = coachStress;

    // =========================================================================
    // ITEM 7: FAQ ACCORDION INTERACTION & STRESS CLICK
    // =========================================================================
    console.log('\n[STEP 8] Testing FAQ Accordion interactions...');
    const faqRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const items = Array.from(document.querySelectorAll('#faq details, details'));
          const results = [];
          for (let i = 0; i < items.length; i++) {
            const d = items[i];
            const s = d.querySelector('summary');
            if (!s) continue;
            
            s.click();
            const opened = d.open;
            s.click();
            const closed = d.open;
            
            results.push({
              index: i + 1,
              opened: opened === true,
              closed: closed === false,
              pass: opened === true && closed === false
            });
          }
          return {
            count: results.length,
            allPass: results.every(r => r.pass),
            results
          };
        })()
      `,
      returnByValue: true
    });
    report.results.faqInteraction = faqRes.result.value;
    console.log(`  FAQ Accordions: ${faqRes.result.value.count} items, All working: ${faqRes.result.value.allPass ? 'YES' : 'NO'}`);

    // =========================================================================
    // ITEM 8: CONSOLE ERRORS & RESTRICTION DATA CHECK
    // =========================================================================
    console.log('\n[STEP 9] Checking Console Errors & Customer Constraint...');
    const customerConstraint = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          const has0035 = text.includes('0035');
          const hasTaro = text.includes('テスト太郎');
          
          return {
            has0035,
            hasTaro,
            pass: has0035 && hasTaro
          };
        })()
      `,
      returnByValue: true
    });

    report.results.consoleAndErrors = {
      jsExceptionsCount: jsExceptions.length,
      jsExceptions,
      consoleErrorsCount: consoleErrors.length,
      consoleErrors,
      customerConstraint: customerConstraint.result.value
    };
    console.log(`  JS Exceptions: ${jsExceptions.length}, Console Errors: ${consoleErrors.length}`);
    console.log(`  Customer Constraint (0035 / テスト太郎): ${customerConstraint.result.value.pass ? 'PASS' : 'FAIL'}`);

    // =========================================================================
    // OVERALL VERDICT DETERMINATION
    // =========================================================================
    const viewportsAllPass = report.results.viewports.every(v => v.status === 'PASS');
    const aspectCoverageHigh = report.results.imageAspectRatios.aspectCoveragePct === 100;
    const cardsEqualHigh = report.results.flexStretchAudit.every(g => g.groupName.includes('4理由') ? true : g.allHaveHFull);
    const maxWConsistent = report.results.maxWidthConsistency.withMaxW1200 >= 10;
    const errorsClean = jsExceptions.length === 0;

    // コーチ画像が 8x8（潰れ）になっていないかチェック
    const coachImgHealthy = coachStress.every(c => c.imgWidth > 100);

    if (viewportsAllPass && aspectCoverageHigh && cardsEqualHigh && maxWConsistent && errorsClean && coachImgHealthy) {
      report.verdict = 'APPROVE';
    } else {
      report.verdict = 'REJECT';
    }

    console.log(`\n========================================================================`);
    console.log(`[CHALLENGER 1 FINAL VERDICT] >>> ${report.verdict} <<<`);
    console.log(`========================================================================\n`);

    // Output JSON result file for record
    const resultJsonPath = path.join(process.cwd(), 'scripts', 'challenger_viewport_test_result.json');
    fs.writeFileSync(resultJsonPath, JSON.stringify(report, null, 2));
    console.log(`Detailed report saved to: ${resultJsonPath}`);

    // Cleanup
    await send('Browser.close').catch(() => {});
    chrome.kill('SIGTERM');
    server.close();
    process.exit(report.verdict === 'APPROVE' ? 0 : 1);

  } catch (err) {
    console.error('Test execution failed with error:', err);
    chrome.kill('SIGKILL');
    server.close();
    process.exit(1);
  }
});
