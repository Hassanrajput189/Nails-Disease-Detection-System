import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const { showNotice } = useNotice();
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(email, password);

      if (result?.error) {
        setError(result.error);
        return;
      }

      showNotice({
        title: 'Password changed successfully',
        text: 'Your password has been updated. You can now log in with your new password.',
        button: 'Continue to login',
      });

      navigate('/login', { replace: true });
    } catch {
      setError('Unable to reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout>
        <h3>Reset Password</h3>

        <p className="text-secondary">
          Please request and verify a password reset code first.
        </p>

        <Link to="/forgot-password" className="auth-link">
          Start password reset
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h3>Create New Password</h3>

        <p className="text-secondary">
          Choose a new password for your account.
        </p>
      </div>

      <Form onSubmit={submit}>
        {/* New Password */}
        <Form.Floating className="mb-3 position-relative">
          <Form.Control
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            style={{ paddingRight: '45px' }}
          />

          <label htmlFor="newPassword">
            New password
          </label>

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={
              showPassword ? 'Hide new password' : 'Show new password'
            }
            title={showPassword ? 'Hide password' : 'Show password'}
            className="border-0 bg-transparent position-absolute"
            style={{
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 5,
              cursor: 'pointer',
              color: '#6c757d',
              padding: '5px',
            }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </Form.Floating>

        {/* Confirm New Password */}
        <Form.Floating className="mb-3 position-relative">
          <Form.Control
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            style={{ paddingRight: '45px' }}
          />

          <label htmlFor="confirmPassword">
            Confirm new password
          </label>

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword((prev) => !prev)
            }
            aria-label={
              showConfirmPassword
                ? 'Hide confirm password'
                : 'Show confirm password'
            }
            title={
              showConfirmPassword
                ? 'Hide password'
                : 'Show password'
            }
            className="border-0 bg-transparent position-absolute"
            style={{
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 5,
              cursor: 'pointer',
              color: '#6c757d',
              padding: '5px',
            }}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </Form.Floating>

        <div className="err mb-2" role="alert">
          {error}
        </div>

        <Button
          type="submit"
          className="btn-grad w-100"
          disabled={loading}
        >
          {loading ? 'Updating password...' : 'Reset Password'}
        </Button>

        <div className="text-center mt-3">
          <Link to="/login" className="auth-link">
            Back to login
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
