
import { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyResetOtp() {
  const { verifyResetOtp, resendResetOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(300);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setTimeout(() => {
      setSeconds((value) => value - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds]);

  const formatTime = (value) =>
    `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await verifyResetOtp(email, otp);

      if (result?.error) {
        setError(result.error);
        return;
      }

      navigate('/reset-password', {
        state: { email },
      });
    } catch {
      setError('Unable to verify the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setMessage('');
    setResending(true);

    try {
      const result = await resendResetOtp(email);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOtp('');
      setSeconds(300);
      setMessage('A new reset code has been sent to your email.');
    } catch {
      setError('Unable to resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout>
        <h4>Reset verification</h4>
        <p className="text-secondary">
          Please request a password reset code first.
        </p>
        <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h3>Verify Reset Code</h3>
        <p className="text-secondary">
          Enter the 6-digit code sent to your email.
        </p>
        <p className="small text-secondary">{email}</p>
      </div>

      <Form onSubmit={submit}>
        <Form.Floating className="mb-3">
          <Form.Control
            id="resetOtp"
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            autoComplete="one-time-code"
            maxLength={6}
            required
          />
          <label htmlFor="resetOtp">6-digit verification code</label>
        </Form.Floating>

        <p className="small text-secondary text-center">
          {seconds > 0
            ? `Code expires in ${formatTime(seconds)}`
            : 'The code may have expired. Request a new one.'}
        </p>

        <div className="err mb-2" role="alert">{error}</div>
        {message && (
          <div className="text-success small mb-3" role="status">
            {message}
          </div>
        )}

        <Button
          type="submit"
          className="btn-grad w-100"
          disabled={loading || otp.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </Button>

        <div className="text-center mt-3">
          <Button
            type="button"
            variant="link"
            className="auth-link"
            onClick={resend}
            disabled={resending || seconds > 240}
          >
            {resending ? 'Sending...' : 'Resend reset code'}
          </Button>
        </div>

        <div className="text-center mt-2">
          <Link to="/login" className="auth-link">Back to login</Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
