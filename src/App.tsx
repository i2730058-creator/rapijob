import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { ToastProvider } from '@/context/ToastContext';
import { Home } from '@/pages/Home';
import { Search } from '@/pages/Search';
import { TechnicianDetail } from '@/pages/TechnicianDetail';
import { RequestService } from '@/pages/RequestService';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Recover } from '@/pages/Recover';
import { ClientPanel } from '@/pages/ClientPanel';
import { TechnicianPanel } from '@/pages/TechnicianPanel';
import { AdminPanel } from '@/pages/AdminPanel';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="/buscar" element={<Search />} />
                <Route path="/tecnico/:id" element={<TechnicianDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/recuperar" element={<Recover />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/solicitar" element={<RequestService />} />
                </Route>

                <Route element={<ProtectedRoute role="cliente" />}>
                  <Route path="/panel" element={<ClientPanel />} />
                </Route>

                <Route element={<ProtectedRoute role="tecnico" />}>
                  <Route path="/panel-tecnico" element={<TechnicianPanel />} />
                </Route>

                <Route element={<ProtectedRoute role="admin" />}>
                  <Route path="/admin" element={<AdminPanel />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
