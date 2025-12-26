import React, { useState } from 'react';
import { Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AuthContext';

// Hash function to generate code
const hashThreeInputs = async (input1, input2, input3) => {
  const combined = input1.toString() + input2.toString() + input3.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Helper function to get today's date in UTC format dd/MM/yyyy
const getTodayUTC = () => {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { email, password } = formData;
      
      // Generate hash code
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(email, password, todayUTC);
      
      // Send GET request to webhook
      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/new-tasks-login';
      const webhookParams = new URLSearchParams({
        email: email,
        password: password
      });
      
      const webhookResponse = await fetch(`${webhookUrl}?${webhookParams}`, {
        method: 'GET',
        headers: {
          'code': code,
          'Content-Type': 'application/json'
        }
      });

      if (!webhookResponse.ok) {
        setError('Authentication service unavailable');
        setLoading(false);
        return;
      }

      const webhookData = await webhookResponse.json();
      
      // Check if login is allowed
      if (!webhookData || webhookData.allowed !== 'yes') {
        setError('Access denied by authentication service');
        setLoading(false);
        return;
      }

      // Proceed with login using the context
      const success = await login(formData.email, formData.password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-black to-red-950/20"></div>
      
      <div className="relative w-full max-w-md">
        {/* HYRAX Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600">
            HYRAX
          </h1>
          <p className="text-white mt-2 text-sm">Task Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-black border border-red-600 rounded-2xl shadow-2xl shadow-red-600/50 p-8" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-600/50">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Welcome Back</h2>
            <p className="text-white text-sm">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-600 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-white text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/50 hover:shadow-xl hover:shadow-red-600/70"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Sign In
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          © 2025 HYRAX Task Management. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;