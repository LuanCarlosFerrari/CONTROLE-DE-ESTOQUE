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
import Dashboard from './pages/dashboard/Dashboard'
import Estoque from './pages/estoque/Estoque'
import Clientes from './pages/estoque/Clientes'
import Vendas from './pages/estoque/Vendas'
import Caixa from './pages/estoque/Caixa'
import Veiculos from './pages/oficina/Veiculos'
import OrdensServico from './pages/oficina/OrdensServico'
import Quartos from './pages/hotel/Quartos'
import Reservas from './pages/hotel/Reservas'
import Fornecedores from './pages/estoque/Fornecedores'
import Mesas from './pages/bar/Mesas'
import Configuracoes from './pages/Configuracoes'

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
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="estoque" element={
              <BusinessRoute allow={['estoque', 'oficina', 'bar']}>
                <Estoque />
              </BusinessRoute>
            } />
            <Route path="clientes" element={<Clientes />} />
            <Route path="vendas" element={
              <BusinessRoute allow={['estoque', 'oficina', 'bar']}>
                <Vendas />
              </BusinessRoute>
            } />
            <Route path="caixa" element={<Caixa />} />
            <Route path="veiculos" element={
              <BusinessRoute allow={['oficina']}>
                <Veiculos />
              </BusinessRoute>
            } />
            <Route path="ordens" element={
              <BusinessRoute allow={['oficina']}>
                <OrdensServico />
              </BusinessRoute>
            } />
            <Route path="quartos" element={
              <BusinessRoute allow={['hotel']}>
                <Quartos />
              </BusinessRoute>
            } />
            <Route path="reservas" element={
              <BusinessRoute allow={['hotel']}>
                <Reservas />
              </BusinessRoute>
            } />
            <Route path="mesas" element={
              <BusinessRoute allow={['bar']}>
                <Mesas />
              </BusinessRoute>
            } />
            <Route path="fornecedores" element={
              <BusinessRoute allow={['estoque', 'oficina', 'hotel', 'bar']}>
                <Fornecedores />
              </BusinessRoute>
            } />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
