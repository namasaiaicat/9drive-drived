import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/LanguageContext'

function FailureMessage() {
  const { language } = useLanguage()
  const isId = language === 'id'
  return <main className="m-auto max-w-md p-6" role="alert"><h1 className="text-xl">{isId ? 'Halaman tidak dapat dimuat' : 'Page unavailable'}</h1><p className="my-4 text-sm">{isId ? 'Muat ulang untuk mencoba kembali.' : 'Reload to try again.'}</p><Button onClick={() => window.location.reload()}>{isId ? 'Muat ulang' : 'Reload'}</Button></main>
}

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <FailureMessage />
  }
}
