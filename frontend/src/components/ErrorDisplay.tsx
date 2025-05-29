import { type FC } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  error: string;
  onClose: () => void;
}

export const ErrorDisplay: FC<Props> = ({ error, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5" />
          </div>
          
          <div className="flex-1">
            <h4 className="text-red-300 font-medium mb-1">Error</h4>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};