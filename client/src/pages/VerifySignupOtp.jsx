
import { useEffect, useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout, { APP_NAME } from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotice } from '../context/NoticeContext.jsx';
import { confetti } from '../utils/confetti.js';

export default function VerifySignupOtp() {
  const { verifySignupOtp, resendSignupOtp } = useAuth();
  const { showNotice } = useNotice();
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
    if (seconds <= 0) return undefined;

    const timer = setTimeout(
      () => setSeconds((value) => value - 1),
      1000
    );

    return () => clearTimeout(timer);
  }, [seconds]);

  const formatTime = (value) =>
    `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

  const submit = async (e) => {
    e.preventDefault();

    if (loading || otp.length !== 6) return;

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await verifySignupOtp(email, otp.trim());

      if (result?.error || !result?.success) {
        setError(
          result?.error || 'Verification was not completed. Please try again.'
        );
        return;
      }

      // Confetti runs only after successful OTP verification
      // and successful account creation by the backend.
      confetti();

      showNotice({
        title: 'Account created successfully',
        highlight: APP_NAME,
        text: 'Your email is verified and your account is ready. Please log in to continue.',
        button: 'Go to login',
      });

      navigate('/login', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resending || seconds > 240 || !email) return;

    setError('');
    setMessage('');
    setResending(true);

    try {
      const result = await resendSignupOtp(email);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOtp('');
      setSeconds(300);
      setMessage(
        'A new verification code has been sent to your email.'
      );
    } catch {
      setError(
        'Unable to resend the verification code. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h3>Verify Your Signup</h3>
          <p className="text-muted">
            Start signup again to receive a verification code.
          </p>
          <Link
            to="/signup"
            className="btn-grad btn d-inline-block"
          >
            Back to sign up
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h3>Verify Your Signup</h3>
        <p className="text-muted mb-1">
          Enter the 6-digit code sent to your email to complete your registration.
        </p>
        <p className="small mb-0">
          <strong>{email}</strong>
        </p>
      </div>

      <Form onSubmit={submit}>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="signup-otp">
            Verification code
          </Form.Label>
          <Form.Control
            id="signup-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            required
          />
        </Form.Group>

        <p className="small text-muted text-center mb-3">
          Code expires in <strong>{formatTime(seconds)}</strong>
        </p>

        {error && (
          <div className="err mb-2" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="text-success small mb-2" role="status">
            {message}
          </div>
        )}

        <Button
          type="submit"
          className="btn-grad w-100 mb-3"
          disabled={loading || otp.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify email'}
        </Button>

        <div className="text-center mb-3">
          <Button
            type="button"
            variant="link"
            onClick={resend}
            disabled={resending || seconds > 240}
            className="p-0"
          >
            {resending ? 'Sending...' : 'Resend code'}
          </Button>

          {seconds > 240 && (
            <div className="small text-muted">
              You can resend in {formatTime(seconds - 240)}
            </div>
          )}
        </div>

        <div className="text-center">
          <Link to="/signup">Back to sign up</Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
