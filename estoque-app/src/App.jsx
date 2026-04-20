import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/PrivateRoute'
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
            <Route path="estoque" element={<Estoque />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="caixa" element={<Caixa />} />
            <Route path="veiculos" element={<Veiculos />} />
            <Route path="ordens" element={<OrdensServico />} />
            <Route path="quartos" element={<Quartos />} />
            <Route path="reservas" element={<Reservas />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
