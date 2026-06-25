import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import AuditList from './components/AuditList'
import AuditDetail from './components/AuditDetail'
import CreateBruteForceAudit from './components/CreateBruteForceAudit'
import CreateLoadAudit from './components/CreateLoadAudit'
import CreatePortScan from './components/CreatePortScan'
import CreateEnumeration from './components/CreateEnumeration'
import CreateHeadersAudit from './components/CreateHeadersAudit'
import CreateApiScan from './components/CreateApiScan'
import CreateSecretsScan from './components/CreateSecretsScan'
import CreateNettackerScan from './components/CreateNettackerScan'
import NettackerResults from './components/NettackerResults'
import TitusResults from './components/TitusResults'
import BrutusResults from './components/BrutusResults'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <Dashboard />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditorias"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <AuditList />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/fuerza-bruta"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateBruteForceAudit />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/carga"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateLoadAudit />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/escaneo-puertos"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreatePortScan />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/enumeracion"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateEnumeration />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/auditoria-headers"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateHeadersAudit />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/api-scanner"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateApiScan />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/busqueda_secretos"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateSecretsScan />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/:auditId"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <AuditDetail />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dominio/:domainId/auditoria/:auditId/nettacker"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <NettackerResults />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/nueva/nettacker"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <CreateNettackerScan />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/:auditId/titus"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <TitusResults />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dominio/:domainId/auditoria/:auditId/brutus"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-950">
                <Navbar />
                <BrutusResults />
              </div>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
