
import { createContext, useContext, useState } from 'react';
import { store } from '../utils/storage.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail;

  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg).join(', ');
  }

  return fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const email = store.get('session', null);
    return email ? store.get('users', {})[email] || null : null;
  });

  const saveUser = (apiUser) => {
    const safeUser = {
      name: apiUser.name,
      email: apiUser.email,
    };

    const users = store.get('users', {});
    users[safeUser.email] = safeUser;

    store.set('users', users);
    store.set('session', safeUser.email);
    setUser(safeUser);

    return safeUser;
  };

  const signup = async (name, email, password) => {
    name = name.trim();
    email = email.trim().toLowerCase();

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Enter your name and a valid email.' };
    }

    if (name.length > 40) {
      return { error: 'Name must be 40 characters or fewer.' };
    }

    if (password.length < 8) {
      return { error: 'Use a password with at least 8 characters.' };
    }

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: getErrorMessage(data, 'Signup failed. Please try again.'),
        };
      }

      // Registration complete. The user now logs in normally (OTP is sent at login).
      return { success: true, email };
    } catch {
      return {
        error: 'Cannot connect to the server. Make sure the backend is running.',
      };
    }
  };

  const login = async (email, password) => {
    email = email.trim().toLowerCase();

    if (!email || !password) {
      return { error: 'Enter your email and password.' };
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: getErrorMessage(
            data,
            'Email or password is incorrect.'
          ),
        };
      }

      // Do not save the user before OTP verification.
      if (data.message === 'otp_required') {
        return { otpRequired: true, email };
      }

      return {
        error: 'The server did not start OTP verification. Please try again.',
      };
    } catch {
      return {
        error: 'Cannot connect to the server. Make sure the backend is running.',
      };
    }
  };

  const verifyLoginOtp = async (email, otp) => {
    try {
      const params = new URLSearchParams({ email, otp });

      const response = await fetch(
        `${API_URL}/login/verify-otp?${params.toString()}`,
        { method: 'POST', credentials: 'include' }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: getErrorMessage(data, 'Invalid or expired verification code.'),
        };
      }

      if (!data.user) {
        return { error: 'The server did not return the verified user.' };
      }

      const safeUser = saveUser(data.user);
      return { user: safeUser };
    } catch {
      return {
        error: 'Cannot connect to the server. Please try again.',
      };
    }
  };

  const resendLoginOtp = async (email) => {
    try {
      const params = new URLSearchParams({ email });

      const response = await fetch(
        `${API_URL}/login/resend-otp?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: getErrorMessage(data, 'Unable to resend the verification code.'),
        };
      }

      return { success: true };
    } catch {
      return {
        error: 'Cannot connect to the server. Please try again.',
      };
    }
  };
  
const forgotPassword = async (email) => {
  try {
    const params = new URLSearchParams({ email });

    const response = await fetch(
      `${API_URL}/forgot-password?${params.toString()}`,
      { method: 'POST' }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: getErrorMessage(
          data,
          'Unable to send the reset code. Please try again.'
        ),
      };
    }

    return { success: true };
  } catch {
    return {
      error: 'Cannot connect to the server. Make sure the backend is running.',
    };
  }
};


const verifyResetOtp = async (email, otp) => {
  try {
    const params = new URLSearchParams({ email, otp });

    const response = await fetch(
      `${API_URL}/verify-otp?${params.toString()}`,
      { method: 'POST' }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: getErrorMessage(
          data,
          'Invalid or expired reset code.'
        ),
      };
    }

    return { success: true };
  } catch {
    return {
      error: 'Cannot connect to the server. Please try again.',
    };
  }
};

const resendResetOtp = async (email) => {
  // Request a fresh reset code using the existing endpoint.
  return await forgotPassword(email);
};

const resetPassword = async (email, newPassword) => {
  try {
    const params = new URLSearchParams({
      email,
      new_password: newPassword,
    });

    const response = await fetch(
      `${API_URL}/reset-password?${params.toString()}`,
      { method: 'POST' }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: getErrorMessage(
          data,
          'Unable to reset password. Please try again.'
        ),
      };
    }

    return { success: true };
  } catch {
    return {
      error: 'Cannot connect to the server. Please try again.',
    };
  }
};


  const logout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'GET',
        credentials: 'include',
      });
    } finally {
      store.set('session', null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signup,
        login,
        verifyLoginOtp,
        resendLoginOtp,
        forgotPassword,
        verifyResetOtp,
        resendResetOtp,
         resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
