import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import PrivateRoute from './components/layout/PrivateRoute'
import BusinessRoute from './components/layout/BusinessRoute'
import Layout from './components/layout/Layout'
import Landing from './pages/auth/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

const Dashboard      = lazy(() => import('./pages/dashboard/Dashboard'))
const Estoque        = lazy(() => import('./pages/estoque/Estoque'))
const Clientes       = lazy(() => import('./pages/estoque/Clientes'))
const Vendas         = lazy(() => import('./pages/estoque/Vendas'))
const Caixa          = lazy(() => import('./pages/estoque/Caixa'))
const Veiculos       = lazy(() => import('./pages/oficina/Veiculos'))
const OrdensServico  = lazy(() => import('./pages/oficina/OrdensServico'))
const Quartos        = lazy(() => import('./pages/hotel/Quartos'))
const Reservas       = lazy(() => import('./pages/hotel/Reservas'))
const Fornecedores   = lazy(() => import('./pages/estoque/Fornecedores'))
const Mesas          = lazy(() => import('./pages/bar/Mesas'))
const Configuracoes  = lazy(() => import('./pages/Configuracoes'))

const PageLoader = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: 14 }}>
    Carregando...
  </div>
)

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={
              <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
            } />
            <Route path="estoque" element={
              <BusinessRoute allow={['estoque', 'oficina', 'bar']}>
                <Suspense fallback={<PageLoader />}><Estoque /></Suspense>
              </BusinessRoute>
            } />
            <Route path="clientes" element={
              <Suspense fallback={<PageLoader />}><Clientes /></Suspense>
            } />
            <Route path="vendas" element={
              <BusinessRoute allow={['estoque', 'oficina', 'bar']}>
                <Suspense fallback={<PageLoader />}><Vendas /></Suspense>
              </BusinessRoute>
            } />
            <Route path="caixa" element={
              <Suspense fallback={<PageLoader />}><Caixa /></Suspense>
            } />
            <Route path="veiculos" element={
              <BusinessRoute allow={['oficina']}>
                <Suspense fallback={<PageLoader />}><Veiculos /></Suspense>
              </BusinessRoute>
            } />
            <Route path="ordens" element={
              <BusinessRoute allow={['oficina']}>
                <Suspense fallback={<PageLoader />}><OrdensServico /></Suspense>
              </BusinessRoute>
            } />
            <Route path="quartos" element={
              <BusinessRoute allow={['hotel']}>
                <Suspense fallback={<PageLoader />}><Quartos /></Suspense>
              </BusinessRoute>
            } />
            <Route path="reservas" element={
              <BusinessRoute allow={['hotel']}>
                <Suspense fallback={<PageLoader />}><Reservas /></Suspense>
              </BusinessRoute>
            } />
            <Route path="mesas" element={
              <BusinessRoute allow={['bar']}>
                <Suspense fallback={<PageLoader />}><Mesas /></Suspense>
              </BusinessRoute>
            } />
            <Route path="fornecedores" element={
              <BusinessRoute allow={['estoque', 'oficina', 'hotel', 'bar']}>
                <Suspense fallback={<PageLoader />}><Fornecedores /></Suspense>
              </BusinessRoute>
            } />
            <Route path="configuracoes" element={
              <Suspense fallback={<PageLoader />}><Configuracoes /></Suspense>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
