import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AdminDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || '/api';
        const res = await axios.get(`${apiUrl}/admin/users`);
        setUsers(res.data);
      } catch (err) { console.error("Failed to fetch users"); } 
      finally { setIsLoading(false); }
    };
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold">Logout</button>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-white/10"><h2 className="text-xl font-bold text-slate-900 dark:text-white">User Management</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 dark:bg-dark-900/50 text-slate-500 dark:text-slate-400 text-sm uppercase"><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {isLoading ? <tr><td colSpan={3} className="text-center py-8 text-slate-500">Loading...</td></tr> : users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-dark-900/30">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">{u.email}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{u.role}</span></td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;