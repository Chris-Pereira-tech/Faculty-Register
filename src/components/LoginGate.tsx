import { useState } from 'react';
import { verifyPassword, markUnlocked } from '../auth';

export default function LoginGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError('');
    const ok = await verifyPassword(password);
    setChecking(false);
    if (!ok) {
      setError('Incorrect password.');
      return;
    }
    markUnlocked();
    onUnlock();
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-card__title">
          Faculty Register
          <small>Department staffing records</small>
        </h1>
        <p className="login-card__hint">Enter the password to access the register.</p>
        <div className={`field ${error ? 'has-error' : ''}`}>
          <label htmlFor="loginPassword">Password</label>
          <input
            id="loginPassword"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
          />
          {error && <span className="error-text">{error}</span>}
        </div>
        <button type="submit" className="btn" disabled={checking || !password}>
          {checking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
