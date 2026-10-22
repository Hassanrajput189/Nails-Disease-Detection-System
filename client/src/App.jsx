import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Predict from './pages/Predict.jsx';
import Results from './pages/Results.jsx';
import Navbar from './components/Navbar.jsx';
import ThemePicker from './components/ThemePicker.jsx';
import VerifyLoginOtp from './pages/VerifyLoginOtp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import VerifyResetOtp from './pages/VerifyResetOtp.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Navbar />
      <main className="container py-4 page-in">{children}</main>
    </>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/" element={<Protected><Predict /></Protected>} />
        <Route path="/results" element={<Protected><Results /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/verify-login-otp" element={<VerifyLoginOtp />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/verify-reset-otp" element={<VerifyResetOtp />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
      </Routes>
      <ThemePicker />
    </>
  );
}
