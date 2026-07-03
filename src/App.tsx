import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@components/ProtectedRoute'
import QaRoleRoute from '@components/QaRoleRoute'
import Login from '@pages/Login'
import ClipsQaDashboard from '@pages/ClipsQaDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/clips" replace />} />
      <Route path="/qa" element={<Navigate to="/clips" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<QaRoleRoute />}>
          <Route path="/clips" element={<ClipsQaDashboard />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
