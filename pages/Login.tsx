import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '/api';
      const res = await axios.post(`${apiUrl}/auth/login`, { email, password });
      
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-white/10">
        <h2 className="text-3xl font-bold text-center mb-6 text-slate-900 dark:text-white font-sans">
          Jupiter <span className="text-brand-500">AI Studio</span>
        </h2>
        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white" required />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50">
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account? <Link to="/register" className="text-brand-500 hover:underline font-bold">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;