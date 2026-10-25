
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setShake(false);
    setLoading(true);

    try {
      const res = await signup(
        form.name,
        form.email,
        form.password
      );

      if (res?.error) {
        setError(res.error);
        requestAnimationFrame(() => setShake(true));
      } else if (res?.otpRequired && res?.email) {
        // Account creation is completed only after OTP verification.
        // Do not trigger confetti at this stage.
        navigate('/verify-signup-otp', {
          replace: true,
          state: { email: res.email },
        });
      } else {
        setError(
          'Could not start email verification. Please try again.'
        );
        requestAnimationFrame(() => setShake(true));
      }
    } catch {
      setError('Something went wrong. Please try again.');
      requestAnimationFrame(() => setShake(true));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="seg">
        <Link to="/login">Log in</Link>
        <Link to="/signup" className="on">
          Sign up
        </Link>
      </div>

      <Form
        onSubmit={submit}
        className={shake ? 'shake' : ''}
      >
        <Form.Floating className="mb-3">
          <Form.Control
            id="sn"
            placeholder="Full name"
            value={form.name}
            onChange={set('name')}
            autoComplete="name"
            maxLength={40}
            required
          />
          <label htmlFor="sn">Full name</label>
        </Form.Floating>

        <Form.Floating className="mb-3">
          <Form.Control
            id="se"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
          <label htmlFor="se">Email</label>
        </Form.Floating>

        <Form.Floating className="mb-2 position-relative">
          <Form.Control
            id="sp"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            minLength={8}
            required
            style={{ paddingRight: '45px' }}
          />
          <label htmlFor="sp">Password (8+ characters)</label>

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={
              showPassword ? 'Hide password' : 'Show password'
            }
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

        {error && (
          <div className="err mb-2" role="alert">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="btn-grad w-100"
          disabled={loading}
        >
          {loading
            ? 'Sending verification code...'
            : 'Create account'}
        </Button>
      </Form>
    </AuthLayout>
  );
}
