import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/PrivateRoute'
import BusinessRoute from './components/BusinessRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Clientes from './pages/Clientes'
import Vendas from './pages/Vendas'
import Caixa from './pages/Caixa'
import Veiculos from './pages/Veiculos'
import OrdensServico from './pages/OrdensServico'
import Quartos from './pages/Quartos'
import Reservas from './pages/Reservas'
import Configuracoes from './pages/Configuracoes'

export default function App() {
  return (
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
              <BusinessRoute allow={['estoque', 'oficina', 'adega']}>
                <Estoque />
              </BusinessRoute>
            } />
            <Route path="clientes" element={<Clientes />} />
            <Route path="vendas" element={
              <BusinessRoute allow={['estoque', 'oficina', 'adega']}>
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
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
