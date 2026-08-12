// Suspense obligatorio: CardViewer usa useSearchParams(), que lanza en SSR sin él (Next.js 16 App Router).
import { Suspense } from 'react'
import CardViewer from './CardViewer'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
          <span className="text-5xl animate-pulse">☕</span>
        </div>
      }
    >
      <CardViewer />
    </Suspense>
  )
}
