import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import MembersPage from './pages/MembersPage';
import OrdersPage from './pages/OrdersPage';
import BooksPage from './pages/BooksPage';
import NewsletterPage from './pages/NewsletterPage';
import AdminsPage from './pages/AdminsPage';
import EventRegistrationsPage from './pages/EventRegistrationsPage';

// Guard: redirects to /members if the current user's role is not in `allowed`
function RequireRole({ allowed, children }) {
  const { user } = useAuth();
  if (!allowed.includes(user?.role)) return <Navigate to="/members" replace />;
  return children;
}

function AppRoutes() {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <LoginPage />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/members" replace />} />
          <Route path="members"     element={<MembersPage />} />
          <Route path="orders"      element={<RequireRole allowed={['owner', 'moderator']}><OrdersPage /></RequireRole>} />
          <Route path="books"       element={<RequireRole allowed={['owner', 'moderator']}><BooksPage /></RequireRole>} />
          <Route path="newsletter"  element={<RequireRole allowed={['owner', 'moderator']}><NewsletterPage /></RequireRole>} />
          <Route path="admins"      element={<RequireRole allowed={['owner']}><AdminsPage /></RequireRole>} />
          <Route path="event-registrations" element={<RequireRole allowed={['owner', 'moderator']}><EventRegistrationsPage /></RequireRole>} />
          <Route path="*"           element={<Navigate to="/members" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
