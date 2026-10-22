import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);

      if (res.error) {
        setError(res.error);
      } else if (res.otpRequired) {
        navigate('/verify-login-otp', {
          state: { email: res.email },
        });
      } else {
        setError(
          'Unable to start OTP verification. Please try again.'
        );
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="seg">
        <Link to="/login" className="on">
          Log in
        </Link>

        <Link to="/signup">
          Sign up
        </Link>
      </div>

      <Form onSubmit={submit}>
        <Form.Floating className="mb-3">
          <Form.Control
            id="le"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <label htmlFor="le">Email</label>
        </Form.Floating>

        <Form.Floating className="mb-2 position-relative">
          <Form.Control
            id="lp"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ paddingRight: '45px' }}
          />

          <label htmlFor="lp">Password</label>

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
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

        <div className="text-end mb-3">
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <div className="err mb-2" role="alert">
          {error}
        </div>

        <Button
          type="submit"
          className="btn-grad w-100"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </Form>
    </AuthLayout>
  );
}
