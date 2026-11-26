import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Layers, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const authData = res.data.data;
      login(authData);

      // Route based on role
      if (authData.user.role === 'SYSTEM_ADMIN') {
        navigate('/admin');
      } else if (authData.memberships?.some((m: any) => m.role === 'ORG_OWNER' || m.role === 'ORG_ADMIN')) {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123456');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#14201A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-left px-4 sm:px-0">
        <div className="inline-flex h-12 w-12 rounded-[12px] bg-[#E8F3EC] text-[#1F5C3A] items-center justify-center mb-4">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#14201A]">Sign in to QueueLess</h2>
        <p className="mt-1 text-sm text-[#6B7A72]">
          Operations management and administrative console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-[#E5E7EB] py-8 px-6 rounded-[16px] sm:px-8 shadow-sm">
          {error && (
            <div className="mb-6 rounded-[12px] bg-red-50 border border-red-200 p-3.5 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-[#6B7A72] mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7A72]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-[12px] text-[#14201A] placeholder-[#6B7A72] text-sm focus:outline-none focus:border-[#1F5C3A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B7A72] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7A72]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-[12px] text-[#14201A] placeholder-[#6B7A72] text-sm focus:outline-none focus:border-[#1F5C3A]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-[12px] text-sm font-semibold text-white bg-[#1F5C3A] hover:bg-[#18472D] transition disabled:opacity-50"
              >
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Quick Fill Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
            <p className="text-xs font-semibold text-[#6B7A72] mb-2.5">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickFill('admin@metrohealth.demo')}
                className="p-2 text-left rounded-[12px] border border-[#E5E7EB] hover:bg-[#E8F3EC] transition"
              >
                <p className="text-xs font-semibold text-[#14201A]">Administrator</p>
                <p className="text-[10px] text-[#6B7A72]">admin@metrohealth.demo</p>
              </button>
              <button
                type="button"
                onClick={() => quickFill('staff@metrohealth.demo')}
                className="p-2 text-left rounded-[12px] border border-[#E5E7EB] hover:bg-[#E8F3EC] transition"
              >
                <p className="text-xs font-semibold text-[#14201A]">Staff Operator</p>
                <p className="text-[10px] text-[#6B7A72]">staff@metrohealth.demo</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
