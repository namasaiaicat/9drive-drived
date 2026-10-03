import { Navigate, Outlet } from 'react-router-dom'
import { getAccessToken } from '@/lib/auth'
import { DriveFilterProvider } from '@/context/DriveFilterContext'

export function ProtectedRoute() {
  return getAccessToken() ? <DriveFilterProvider><Outlet /></DriveFilterProvider> : <Navigate to="/login" replace />
}
