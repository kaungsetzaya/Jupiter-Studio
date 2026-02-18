import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) => /^[a-zA-Z0-9._%+-]+@(gmail|outlook)\.com$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) { setError('Only @gmail.com and @outlook.com allowed.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 chars.'); return; }

    setIsLoading(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '/api';
      await axios.post(`${apiUrl}/auth/register`, { email, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-white/10">
        <h2 className="text-3xl font-bold text-center mb-6 text-slate-900 dark:text-white font-sans">Create Account</h2>
        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white" required />
          <button type="submit" disabled={isLoading} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50">
            {isLoading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">Already have an account? <Link to="/login" className="text-brand-500 hover:underline font-bold">Sign In</Link></p>
      </div>
    </div>
  );
};

export default Register;