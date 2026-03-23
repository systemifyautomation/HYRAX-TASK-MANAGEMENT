import React from 'react';
import { Link } from 'react-router-dom';
import { Info, ExternalLink, Code2, Zap, Users, BarChart3, ArrowLeft } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Link */}
        <div className="mb-6">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>

        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-900 dark:from-gray-700 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Info className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 dark:from-gray-100 to-red-600 bg-clip-text text-transparent">
                About HYRAX
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Task Management System</p>
            </div>
          </div>
        </div>

        {/* App Description */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Code2 className="w-6 h-6 text-red-600 dark:text-red-500" />
            What is HYRAX?
          </h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              HYRAX is a comprehensive task management platform designed specifically for creative teams 
              working on social media advertising campaigns. It streamlines the workflow between media buyers, 
              video editors, graphic designers, and campaign managers.
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-red-600 dark:text-red-500" />
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Team Collaboration</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Role-based access control for team members, managers, and administrators
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-gray-900 dark:text-gray-300" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Performance Tracking</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Monitor task completion rates and team productivity metrics
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Campaign Management</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Organize tasks by campaigns and ad accounts for better clarity
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-gray-900 dark:text-gray-300" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Real-time Updates</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Instant feedback and status changes with optimistic UI updates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Creator Section */}
        <div className="bg-gradient-to-br from-gray-900 dark:from-black to-red-700 dark:to-red-800 rounded-2xl shadow-xl p-8 text-white transition-colors">
          <h2 className="text-2xl font-bold mb-4">Created By</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Yassir Amhot</h3>
              <p className="text-gray-100 dark:text-gray-200 mb-4">
                Founder of{' '}
                <a 
                  href="https://systemifyautomation.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-white hover:text-red-300 transition-colors underline decoration-2 underline-offset-2"
                >
                  Systemify Automation
                  <ExternalLink className="w-4 h-4" />
                </a>
              </p>
              <p className="text-gray-100 dark:text-gray-200 text-sm leading-relaxed">
                Specializing in custom automation solutions and business process optimization. 
                Building tools that help teams work smarter, not harder.
              </p>
            </div>
            
            <div className="pt-4 border-t border-red-500/30 dark:border-red-600/30">
              <a 
                href="https://systemifyautomation.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-100 text-red-600 dark:text-red-700 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-white transition-all transform hover:scale-105 shadow-lg"
              >
                Visit Systemify Automation
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 dark:text-gray-400 text-sm">
          <p>© 2026 HYRAX Task Management. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default About;
