import React from 'react';
import { useApp } from '../context/AuthContext';
import { Users, Palette } from 'lucide-react';

// Color options for media buyers
const BUYER_COLOR_OPTIONS = [
  { name: 'red', label: 'Red', swatch: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900', text: 'text-red-900 dark:text-red-100', border: 'border-red-200 dark:border-red-600', hover: 'hover:bg-red-100 dark:hover:bg-red-800', hoverBorder: 'hover:border-red-300 dark:hover:border-red-500' },
  { name: 'orange', label: 'Orange', swatch: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900', text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-200 dark:border-orange-600', hover: 'hover:bg-orange-100 dark:hover:bg-orange-800', hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-500' },
  { name: 'amber', label: 'Amber', swatch: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900', text: 'text-amber-900 dark:text-amber-100', border: 'border-amber-200 dark:border-amber-600', hover: 'hover:bg-amber-100 dark:hover:bg-amber-800', hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500' },
  { name: 'lime', label: 'Lime', swatch: 'bg-lime-500', bg: 'bg-lime-50 dark:bg-lime-900', text: 'text-lime-900 dark:text-lime-100', border: 'border-lime-200 dark:border-lime-600', hover: 'hover:bg-lime-100 dark:hover:bg-lime-800', hoverBorder: 'hover:border-lime-300 dark:hover:border-lime-500' },
  { name: 'green', label: 'Green', swatch: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-900 dark:text-green-100', border: 'border-green-200 dark:border-green-600', hover: 'hover:bg-green-100 dark:hover:bg-green-800', hoverBorder: 'hover:border-green-300 dark:hover:border-green-500' },
  { name: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900', text: 'text-emerald-900 dark:text-emerald-100', border: 'border-emerald-200 dark:border-emerald-600', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-800', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500' },
  { name: 'cyan', label: 'Cyan', swatch: 'bg-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900', text: 'text-cyan-900 dark:text-cyan-100', border: 'border-cyan-200 dark:border-cyan-600', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-800', hoverBorder: 'hover:border-cyan-300 dark:hover:border-cyan-500' },
  { name: 'sky', label: 'Sky Blue', swatch: 'bg-sky-500', bg: 'bg-sky-50 dark:bg-sky-900', text: 'text-sky-900 dark:text-sky-100', border: 'border-sky-200 dark:border-sky-600', hover: 'hover:bg-sky-100 dark:hover:bg-sky-800', hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-500' },
  { name: 'blue', label: 'Blue', swatch: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-200 dark:border-blue-600', hover: 'hover:bg-blue-100 dark:hover:bg-blue-800', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500' },
  { name: 'indigo', label: 'Indigo', swatch: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900', text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-200 dark:border-indigo-600', hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-800', hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500' },
  { name: 'violet', label: 'Violet', swatch: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-900', text: 'text-violet-900 dark:text-violet-100', border: 'border-violet-200 dark:border-violet-600', hover: 'hover:bg-violet-100 dark:hover:bg-violet-800', hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-500' },
  { name: 'purple', label: 'Purple', swatch: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900', text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-200 dark:border-purple-600', hover: 'hover:bg-purple-100 dark:hover:bg-purple-800', hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-500' },
  { name: 'fuchsia', label: 'Fuchsia', swatch: 'bg-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900', text: 'text-fuchsia-900 dark:text-fuchsia-100', border: 'border-fuchsia-200 dark:border-fuchsia-600', hover: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-800', hoverBorder: 'hover:border-fuchsia-300 dark:hover:border-fuchsia-500' },
  { name: 'pink', label: 'Pink', swatch: 'bg-pink-500', bg: 'bg-pink-50 dark:bg-pink-900', text: 'text-pink-900 dark:text-pink-100', border: 'border-pink-200 dark:border-pink-600', hover: 'hover:bg-pink-100 dark:hover:bg-pink-800', hoverBorder: 'hover:border-pink-300 dark:hover:border-pink-500' },
  { name: 'rose', label: 'Rose', swatch: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-900', text: 'text-rose-900 dark:text-rose-100', border: 'border-rose-200 dark:border-rose-600', hover: 'hover:bg-rose-100 dark:hover:bg-rose-800', hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500' },
  { name: 'slate', label: 'Slate', swatch: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-900 dark:text-slate-100', border: 'border-slate-200 dark:border-slate-600', hover: 'hover:bg-slate-100 dark:hover:bg-slate-800', hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-500' },
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
