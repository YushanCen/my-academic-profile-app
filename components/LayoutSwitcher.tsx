
import React from 'react';
import { ThemeType } from '../types';
import { ACADEMIC_PALETTES, THEME_LIST } from '../constants';

interface LayoutSwitcherProps {
  currentTheme: ThemeType;
  setTheme: (t: ThemeType) => void;
  primaryColor: string;
  setPrimaryColor: (c: string) => void;
}

const LayoutSwitcher: React.FC<LayoutSwitcherProps> = ({ 
  currentTheme, setTheme, primaryColor, setPrimaryColor 
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Designer Controls</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Aesthetic Theme</label>
          <div className="flex flex-wrap gap-2">
            {THEME_LIST.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id as ThemeType)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  currentTheme === theme.id 
                  ? 'bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Accent Color</label>
          <div className="flex flex-wrap gap-2">
            {ACADEMIC_PALETTES.flatMap(group => group.colors).map((c) => (
              <button
                key={c.primary}
                onClick={() => setPrimaryColor(c.primary)}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                  primaryColor === c.primary ? 'ring-2 ring-slate-400 ring-offset-2 scale-110' : ''
                }`}
                style={{ backgroundColor: c.primary }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutSwitcher;
