import React, { useState } from 'react';
import { PanelLeft, LayoutDashboard, Check } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

const DesignPage = () => {
  const { navMode, setNavMode } = useLayout();
  const [selected, setSelected] = useState(navMode);

  const handleSelect = (value) => {
    setSelected(value);
    setNavMode(value);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Design & Layout</h1>
        <p className="mt-2 text-slate-600">Choose how you want your navigation to look and feel.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Classic Sidebar Option */}
        <button
          type="button"
          onClick={() => handleSelect('classic')}
          className={`relative text-left rounded-2xl border-2 p-6 transition-all duration-200 ${
            selected === 'classic'
              ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {selected === 'classic' && (
            <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
              <Check size={16} />
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${selected === 'classic' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <PanelLeft size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Classic Sidebar</h2>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 mb-4">
            <div className="flex gap-2 h-32">
              <div className="w-12 bg-nani-dark rounded-lg flex flex-col items-center py-2 gap-1.5">
                <div className="w-6 h-6 rounded bg-white/20" />
                <div className="w-6 h-6 rounded bg-white/20" />
                <div className="w-6 h-6 rounded bg-white/20" />
                <div className="w-6 h-6 rounded bg-white/20" />
              </div>
              <div className="flex-1 bg-white rounded-lg p-2">
                <div className="h-3 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-2 bg-slate-100 rounded w-full mb-1" />
                <div className="h-2 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Navigation sidebar is always visible on the left side. Quick access to all pages at a glance.
          </p>
        </button>

        {/* Clean Dashboard Option */}
        <button
          type="button"
          onClick={() => handleSelect('clean')}
          className={`relative text-left rounded-2xl border-2 p-6 transition-all duration-200 ${
            selected === 'clean'
              ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {selected === 'clean' && (
            <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
              <Check size={16} />
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${selected === 'clean' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <LayoutDashboard size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Clean Dashboard</h2>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 mb-4">
            <div className="flex gap-2 h-32">
              <div className="flex-1 bg-white rounded-lg p-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 bg-slate-200 rounded w-16" />
                  <div className="h-4 bg-blue-200 rounded w-20" />
                </div>
                <div className="h-2 bg-slate-100 rounded w-full mb-1" />
                <div className="h-2 bg-slate-100 rounded w-2/3 mb-1" />
                <div className="h-2 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Clean, full-width dashboard with no sidebar. Click the "Go To Menu" button in the header whenever you need to navigate.
          </p>
        </button>
      </div>

      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">
          <strong>Tip:</strong> You can change this anytime by clicking <strong>Design</strong> in the sidebar or menu. Your preference is saved and remembered across sessions.
        </p>
      </div>
    </div>
  );
};

export default DesignPage;
