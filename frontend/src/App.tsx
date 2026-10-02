import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DriveLayout } from '@/layouts/DriveLayout'
import { AllFilesPage } from '@/pages/AllFilesPage'
import { ArchivedPage } from '@/pages/ArchivedPage'
import { LoginPage } from '@/pages/LoginPage'
import { GoogleAuthPage } from '@/pages/GoogleAuthPage'
import { GoogleConnectedPage } from '@/pages/GoogleConnectedPage'
import { QuotaTrackerPage } from '@/pages/QuotaTrackerPage'
import { RecentPage } from '@/pages/RecentPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SharedPage } from '@/pages/SharedPage'
import { StarredPage } from '@/pages/StarredPage'
import { PublicFilePage } from '@/pages/PublicFilePage'
import { ApiManagementPage } from '@/pages/ApiManagementPage'
import { TrashPage } from '@/pages/TrashPage'
import { ActivityLogPage } from '@/pages/ActivityLogPage'
import { ToolsHubPage } from '@/pages/tools/ToolsHubPage'
import { BackgroundRemoverTool } from '@/pages/tools/BackgroundRemoverTool'
import { PdfToolsView } from '@/pages/tools/PdfToolsView'
import { ImageToolsView } from '@/pages/tools/ImageToolsView'
import { VideoToolsView } from '@/pages/tools/VideoToolsView'
import { DataToolsView } from '@/pages/tools/DataToolsView'
import { UploadProvider } from '@/context/UploadContext'
import { DriveFilterProvider } from '@/context/DriveFilterContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider } from '@/context/LanguageContext'

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <DriveFilterProvider>
          <UploadProvider>
            <Routes>
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
          </Routes>
          </UploadProvider>
        </DriveFilterProvider>
      </ToastProvider>
    </LanguageProvider>
  )
}


export default App
