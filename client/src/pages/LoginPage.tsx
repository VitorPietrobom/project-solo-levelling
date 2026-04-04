import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signup(email, password);
        setInfo('Check your email to confirm your account, then sign in.');
        setIsSignUp(false);
      } else {
        await login(email, password);
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8 rounded-lg bg-card border border-border"
      >
        <h1 className="text-2xl font-bold text-text-primary mb-6 text-center">
          Level Up Portal
        </h1>

        {error && (
          <p className="text-accent-warning text-sm mb-4" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="text-accent-success text-sm mb-4" role="status">
            {info}
          </p>
        )}

        <label className="block mb-4">
          <span className="text-text-secondary text-sm">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 rounded bg-secondary text-text-primary border border-border focus:outline-none focus:border-accent-primary"
          />
        </label>

        <label className="block mb-6">
          <span className="text-text-secondary text-sm">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full px-3 py-2 rounded bg-secondary text-text-primary border border-border focus:outline-none focus:border-accent-primary"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded font-semibold bg-accent-primary text-primary hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>

        <p className="text-text-secondary text-sm text-center mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo(''); }}
            className="text-accent-info hover:opacity-80"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </form>
    </div>
  );
}
