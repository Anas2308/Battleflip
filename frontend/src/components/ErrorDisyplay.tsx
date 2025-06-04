import { type FC } from 'react';

interface Props {
  error: string;
  onClose: () => void;
}

export const ErrorDisplay: FC<Props> = ({ error, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 text-red-500">⚠️</div>
          </div>
          
          <div className="flex-1">
            <h4 className="text-red-800 font-medium mb-1">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};