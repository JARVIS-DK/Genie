import React from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { OptionsModalProps } from '../types';

export const OptionsModal: React.FC<OptionsModalProps> = ({ onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Choose Your Mode</h3>
        
        <button
          onClick={() => onSelect('deep-research')}
          className="w-full mb-3 p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg flex items-center gap-3 transition-all transform hover:scale-105"
        >
          <Sparkles size={24} />
          <div className="text-left">
            <div className="font-semibold">Deep Research</div>
            <div className="text-xs opacity-90">Comprehensive analysis and insights</div>
          </div>
        </button>

        <button
          onClick={() => onSelect('browser-use')}
          className="w-full mb-4 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg flex items-center gap-3 transition-all transform hover:scale-105"
        >
          <Globe size={24} />
          <div className="text-left">
            <div className="font-semibold">Browser Use</div>
            <div className="text-xs opacity-90">Search and browse the web</div>
          </div>
        </button>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};