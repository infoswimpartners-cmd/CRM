import { Metadata } from 'next'
import { TopLandingPage } from '@/components/landing/TopLandingPage'

export const metadata: Metadata = {
  title: '【プレビュー】Swim Partners 公式トップページ',
  description: 'Swim Partners の公式トップページ（ランディングページ）のプレビュー確認ページです。',
  robots: {
    index: false,
    follow: false
  }
}

export default function PreviewPage() {
  return <TopLandingPage isPreview={true} />
}
