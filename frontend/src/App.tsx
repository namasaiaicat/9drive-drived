import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DriveLayout } from '@/layouts/DriveLayout'
import { UploadProvider } from '@/context/UploadContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider, useLanguage } from '@/context/LanguageContext'

const AllFilesPage = lazy(() => import('@/pages/AllFilesPage').then(m => ({ default: m.AllFilesPage })))
const ArchivedPage = lazy(() => import('@/pages/ArchivedPage').then(m => ({ default: m.ArchivedPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const GoogleAuthPage = lazy(() => import('@/pages/GoogleAuthPage').then(m => ({ default: m.GoogleAuthPage })))
const GoogleConnectedPage = lazy(() => import('@/pages/GoogleConnectedPage').then(m => ({ default: m.GoogleConnectedPage })))
const QuotaTrackerPage = lazy(() => import('@/pages/QuotaTrackerPage').then(m => ({ default: m.QuotaTrackerPage })))
const RecentPage = lazy(() => import('@/pages/RecentPage').then(m => ({ default: m.RecentPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const SharedPage = lazy(() => import('@/pages/SharedPage').then(m => ({ default: m.SharedPage })))
const StarredPage = lazy(() => import('@/pages/StarredPage').then(m => ({ default: m.StarredPage })))
const PublicFilePage = lazy(() => import('@/pages/PublicFilePage').then(m => ({ default: m.PublicFilePage })))
const ApiManagementPage = lazy(() => import('@/pages/ApiManagementPage').then(m => ({ default: m.ApiManagementPage })))
const TrashPage = lazy(() => import('@/pages/TrashPage').then(m => ({ default: m.TrashPage })))
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage').then(m => ({ default: m.ActivityLogPage })))
const ToolsHubPage = lazy(() => import('@/pages/tools/ToolsHubPage').then(m => ({ default: m.ToolsHubPage })))
const BackgroundRemoverTool = lazy(() => import('@/pages/tools/BackgroundRemoverTool').then(m => ({ default: m.BackgroundRemoverTool })))
const PdfToolsView = lazy(() => import('@/pages/tools/PdfToolsView').then(m => ({ default: m.PdfToolsView })))
const ImageToolsView = lazy(() => import('@/pages/tools/ImageToolsView').then(m => ({ default: m.ImageToolsView })))
const VideoToolsView = lazy(() => import('@/pages/tools/VideoToolsView').then(m => ({ default: m.VideoToolsView })))
const DataToolsView = lazy(() => import('@/pages/tools/DataToolsView').then(m => ({ default: m.DataToolsView })))

function PageLoading() {
  const { language } = useLanguage()
  return <p role="status" className="p-6 text-sm text-[#444746] dark:text-[#C4C7C5]">{language === 'id' ? 'Memuat halaman…' : 'Loading page…'}</p>
}

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
          <UploadProvider>
            <RouteErrorBoundary><Suspense fallback={<PageLoading />}><Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="google-auth" element={<GoogleAuthPage />} />
      <Route path="google-connected" element={<GoogleConnectedPage />} />
      <Route path="public/files/:token" element={<PublicFilePage />} />
      <Route path="public/files/:token/embed" element={<PublicFilePage embed />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DriveLayout />}>
          <Route index element={<Navigate to="/all-files" replace />} />
          <Route path="all-files" element={<AllFilesPage />} />
          <Route path="tools" element={<ToolsHubPage />} />
          <Route path="tools/remove-bg" element={<BackgroundRemoverTool />} />
          <Route path="tools/pdf" element={<PdfToolsView />} />
          <Route path="tools/image" element={<ImageToolsView />} />
          <Route path="tools/video" element={<VideoToolsView />} />
          <Route path="tools/data" element={<DataToolsView />} />
          <Route path="quota" element={<QuotaTrackerPage />} />
          <Route path="shared" element={<SharedPage />} />
          <Route path="recent" element={<RecentPage />} />
          <Route path="starred" element={<StarredPage />} />
          <Route path="archived" element={<ArchivedPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="api" element={<ApiManagementPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/all-files" replace />} />
            </Routes></Suspense></RouteErrorBoundary>
          </UploadProvider>
      </ToastProvider>
    </LanguageProvider>
  )
}


export default App
