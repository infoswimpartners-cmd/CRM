import { Metadata } from 'next'
import { TopLandingPage } from '@/components/landing/TopLandingPage'

export const metadata: Metadata = {
  title: '【テスト／プレビュー】Swim Partners 公式トップページ',
  description: 'Swim Partners の公式トップページ（ランディングページ）のテスト・プレビュー確認ページです。',
  robots: {
    index: false,
    follow: false
  }
}

export default function TestPage() {
  return <TopLandingPage isPreview={true} />
}
