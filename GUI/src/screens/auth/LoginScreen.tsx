import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginScreen.css';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setTimeout(() => {
      login(demoEmail, demoPassword);
    }, 100);
  };

  const handleForgotPassword = () => {
    setIsFlipped(true);
    setError('');
  };

  const handleBackToLogin = () => {
    setIsFlipped(false);
    setResetSuccess(false);
    setResetEmail('');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate sending reset email
    setTimeout(() => {
      setResetSuccess(true);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="login-container-split">
      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="branding-content">
          <div className="logo-large">
            <svg className="logo-svg-large" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="brand-title">Emergency Response</h1>
          <p className="brand-subtitle">AI-Powered Command & Control Platform</p>
          <div className="brand-features">
            <div className="feature-item">
              <span className="material-symbols-outlined">radar</span>
              <span>Real-Time Detection</span>
            </div>
            <div className="feature-item">
              <span className="material-symbols-outlined">emergency</span>
              <span>Multi-Agency Coordination</span>
            </div>
            <div className="feature-item">
              <span className="material-symbols-outlined">analytics</span>
              <span>Advanced Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form with Flip Animation */}
      <div className="login-right">
        <div className={`flip-container ${isFlipped ? 'flipped' : ''}`}>
          {/* Front Side - Login */}
          <div className="flip-card-front">
            <div className="login-form-container">
              <div className="form-header">
                <h2 className="form-title">Welcome Back</h2>
                <p className="form-subtitle">Sign in to your account</p>
              </div>

              <form className="login-form-split" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error-split">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group-split">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper-split">
                <span className="material-symbols-outlined">mail</span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@system.gov.sa"
                  required
                />
              </div>
            </div>

            <div className="form-group-split">
              <div className="password-header">
                <label htmlFor="password">Password</label>
                <button type="button" className="forgot-link" onClick={handleForgotPassword}>
                  Forgot Password?
                </button>
              </div>
              <div className="input-wrapper-split">
                <span className="material-symbols-outlined">lock</span>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-login-split" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined spinning">sync</span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="divider-split">
            <span>Quick Access</span>
          </div>

          <div className="demo-grid">
            <button className="demo-card" onClick={() => handleDemoLogin('admin@system.gov.sa', 'password123')}>
              <span className="material-symbols-outlined demo-icon">admin_panel_settings</span>
              <div className="demo-info">
                <div className="demo-role-split">Administrator</div>
                <div className="demo-desc">Full System Access</div>
              </div>
            </button>
            <button className="demo-card" onClick={() => handleDemoLogin('responder@hospital.gov', 'password123')}>
              <span className="material-symbols-outlined demo-icon">local_hospital</span>
              <div className="demo-info">
                <div className="demo-role-split">First Responder</div>
                <div className="demo-desc">Emergency Response</div>
              </div>
            </button>
          </div>
            </div>
          </div>

          {/* Back Side - Forgot Password */}
          <div className="flip-card-back">
            <div className="login-form-container">
              <button className="back-button" onClick={handleBackToLogin}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>

              <div className="form-header">
                <div className="reset-icon-container">
                  <span className="material-symbols-outlined reset-icon">lock_reset</span>
                </div>
                <h2 className="form-title">Reset Password</h2>
                <p className="form-subtitle">
                  {resetSuccess 
                    ? "Check your email for reset instructions"
                    : "Enter your email to receive password reset instructions"}
                </p>
              </div>

              {!resetSuccess ? (
                <form className="login-form-split" onSubmit={handleResetSubmit}>
                  <div className="form-group-split">
                    <label htmlFor="reset-email">Email Address</label>
                    <div className="input-wrapper-split">
                      <span className="material-symbols-outlined">mail</span>
                      <input
                        type="email"
                        id="reset-email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-login-split" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined spinning">sync</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <span className="material-symbols-outlined">send</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="reset-success">
                  <div className="success-animation">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <p className="success-message">
                    We've sent a password reset link to <strong>{resetEmail}</strong>
                  </p>
                  <p className="success-note">
                    Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <button className="btn-login-split" onClick={handleBackToLogin}>
                    Back to Login
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              )}

              <div className="reset-help">
                <span className="material-symbols-outlined">info</span>
                <p>
                  Didn't receive the email? Check your spam folder or{' '}
                  <button className="help-link" onClick={() => setResetSuccess(false)}>
                    try again
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
