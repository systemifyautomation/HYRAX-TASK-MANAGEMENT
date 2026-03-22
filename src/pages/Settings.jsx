import React from 'react';
import { useApp } from '../context/AuthContext';
import { Users, Palette } from 'lucide-react';

// Color options for media buyers
const BUYER_COLOR_OPTIONS = [
  { name: 'red', label: 'Red', swatch: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-900 dark:text-red-200', border: 'border-red-200 dark:border-red-800', hover: 'hover:bg-red-100 dark:hover:bg-red-900/30', hoverBorder: 'hover:border-red-300 dark:hover:border-red-700' },
  { name: 'orange', label: 'Orange', swatch: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-800', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30', hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700' },
  { name: 'amber', label: 'Amber', swatch: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-800', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30', hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700' },
  { name: 'lime', label: 'Lime', swatch: 'bg-lime-500', bg: 'bg-lime-50 dark:bg-lime-900/20', text: 'text-lime-900 dark:text-lime-200', border: 'border-lime-200 dark:border-lime-800', hover: 'hover:bg-lime-100 dark:hover:bg-lime-900/30', hoverBorder: 'hover:border-lime-300 dark:hover:border-lime-700' },
  { name: 'green', label: 'Green', swatch: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-900 dark:text-green-200', border: 'border-green-200 dark:border-green-800', hover: 'hover:bg-green-100 dark:hover:bg-green-900/30', hoverBorder: 'hover:border-green-300 dark:hover:border-green-700' },
  { name: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-900 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700' },
  { name: 'cyan', label: 'Cyan', swatch: 'bg-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-900 dark:text-cyan-200', border: 'border-cyan-200 dark:border-cyan-800', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30', hoverBorder: 'hover:border-cyan-300 dark:hover:border-cyan-700' },
  { name: 'sky', label: 'Sky Blue', swatch: 'bg-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-900 dark:text-sky-200', border: 'border-sky-200 dark:border-sky-800', hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/30', hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700' },
  { name: 'blue', label: 'Blue', swatch: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-800', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700' },
  { name: 'indigo', label: 'Indigo', swatch: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-900 dark:text-indigo-200', border: 'border-indigo-200 dark:border-indigo-800', hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30', hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700' },
  { name: 'violet', label: 'Violet', swatch: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-900 dark:text-violet-200', border: 'border-violet-200 dark:border-violet-800', hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/30', hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700' },
  { name: 'purple', label: 'Purple', swatch: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-900 dark:text-purple-200', border: 'border-purple-200 dark:border-purple-800', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30', hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700' },
  { name: 'fuchsia', label: 'Fuchsia', swatch: 'bg-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', text: 'text-fuchsia-900 dark:text-fuchsia-200', border: 'border-fuchsia-200 dark:border-fuchsia-800', hover: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30', hoverBorder: 'hover:border-fuchsia-300 dark:hover:border-fuchsia-700' },
  { name: 'pink', label: 'Pink', swatch: 'bg-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-900 dark:text-pink-200', border: 'border-pink-200 dark:border-pink-800', hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30', hoverBorder: 'hover:border-pink-300 dark:hover:border-pink-700' },
  { name: 'rose', label: 'Rose', swatch: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-900 dark:text-rose-200', border: 'border-rose-200 dark:border-rose-800', hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30', hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700' },
  { name: 'slate', label: 'Slate', swatch: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-900 dark:text-slate-200', border: 'border-slate-200 dark:border-slate-800', hover: 'hover:bg-slate-100 dark:hover:bg-slate-900/30', hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-700' },
];

export { BUYER_COLOR_OPTIONS };

const Settings = () => {
  const { users, buyerColors, updateBuyerColor } = useApp();
  const mediaBuyers = users.filter(u => u.department === 'MEDIA BUYING');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Palette className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Media Buyer Colors</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 ml-9">Assign unique colors to each media buyer for easy identification on the Card Overview</p>
      </div>

      {/* Content */}
      {mediaBuyers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No media buyers found</p>
          <p className="text-gray-400 text-sm mt-1">Users with department "MEDIA BUYING" will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mediaBuyers.map((buyer) => {
            const assignedColorName = buyerColors[buyer.id];
            const assignedColor = BUYER_COLOR_OPTIONS.find(c => c.name === assignedColorName);
            return (
              <div key={buyer.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {buyer.profile_picture ? (
                      <img src={buyer.profile_picture} alt={buyer.name} className={`w-10 h-10 rounded-full object-cover ${
                        assignedColor ? `${assignedColor.border} border-2` : ''
                      }`} />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        assignedColor ? `${assignedColor.bg} ${assignedColor.text} ${assignedColor.border} border-2` : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {(buyer.name || buyer.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{buyer.name || buyer.email}</p>
                      <p className="text-sm text-gray-400">{buyer.email}</p>
                    </div>
                  </div>
                  {assignedColor && (
                    <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${assignedColor.bg} ${assignedColor.text} ${assignedColor.border} border`}>
                      {assignedColor.label}
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Select color</p>
                  <div className="flex flex-wrap gap-2">
                    {BUYER_COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => updateBuyerColor(buyer.id, color.name)}
                        className={`w-7 h-7 rounded-full ${color.swatch} transition-all duration-150 hover:scale-110 ${
                          assignedColorName === color.name
                            ? 'ring-2 ring-offset-2 ring-primary-600 scale-110'
                            : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'
                        }`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Settings;
