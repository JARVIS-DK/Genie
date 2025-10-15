import React from 'react';
import { UseCaseButtonProps } from '../types';

export const UseCaseButton: React.FC<UseCaseButtonProps> = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="text-left px-4 py-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 transition-all hover:shadow-md"
    >
      {text}
    </button>
  );
};