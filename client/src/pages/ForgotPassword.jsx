
import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await forgotPassword(email.trim().toLowerCase());

      if (result?.error) {
        setError(result.error);
        return;
      }

      navigate('/verify-reset-otp', {
        state: { email: email.trim().toLowerCase() },
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h3>Forgot Password?</h3>
        <p className="text-secondary">
          Enter your registered email and we’ll send you a password reset code.
        </p>
      </div>

      <Form onSubmit={submit}>
        <Form.Floating className="mb-3">
          <Form.Control
            id="forgotEmail"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <label htmlFor="forgotEmail">Email address</label>
        </Form.Floating>

        <div className="err mb-2" role="alert">{error}</div>

        <Button
          type="submit"
          className="btn-grad w-100"
          disabled={loading}
        >
          {loading ? 'Sending code...' : 'Send Reset Code'}
        </Button>

        <div className="text-center mt-3" >
          <Link to="/login" className="auth-link">Back to login</Link>
        </div>
      </Form>
    </AuthLayout>
  );
}
