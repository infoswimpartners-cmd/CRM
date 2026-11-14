import { NextRequest, NextResponse } from 'next/server';
import { sendGA4ConversionEvent } from '@/lib/ga4-measurement-protocol';

export const dynamic = 'force-dynamic';

const LINE_REDIRECT_URLS: Record<string, string> = {
  apply: 'https://lin.ee/Va5wa9s',
  inquiry: 'https://lin.ee/j8yROYE',
};

const DEFAULT_REDIRECT_URL = LINE_REDIRECT_URLS.apply;

/**
 * GET /go/line
 * LINE友だち追加ボタンのクリック計測＆リダイレクト中継エンドポイント
 *
 * クエリパラメータ:
 * - type: apply (申込) | inquiry (問合せ)
 * - pos: header | hero | bottom | sticky 等
 * - page: クリックされたページのパス
 */
export async function GET(request: NextRequest) {
  let targetUrl = DEFAULT_REDIRECT_URL;

  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type')?.trim() ?? '';
    const pos = searchParams.get('pos')?.trim() ?? '';
    const page = searchParams.get('page')?.trim() ?? '';

    if (type && LINE_REDIRECT_URLS[type]) {
      targetUrl = LINE_REDIRECT_URLS[type];
    } else if (type) {
      console.warn(
        `[LINE Redirect] Unknown type="${type}", falling back to default (${DEFAULT_REDIRECT_URL})`
      );
    }

    // サーバーログへの記録
    console.log(
      `[LINE Redirect] cta_line_click: type="${type}", pos="${pos}", page="${page}" -> ${targetUrl}`
    );

    // 処理1（計測）：GA4 Measurement Protocol で cta_line_click を送信
    try {
      await sendGA4ConversionEvent({
        eventName: 'cta_line_click',
        params: {
          cta_type: type,
          cta_position: pos,
          page_path: page,
        },
      });
    } catch (ga4Error) {
      console.warn(
        '[LINE Redirect] GA4 Measurement Protocol failed (non-blocking):',
        ga4Error
      );
    }
  } catch (err) {
    console.error('[LINE Redirect] Unexpected error before redirect:', err);
  }

  // 処理2（転送）：302 リダイレクト（計測成否に関わらず必ず実行）
  return NextResponse.redirect(targetUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
