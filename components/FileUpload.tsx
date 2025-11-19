import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0].type === 'text/csv') {
        onFileSelect(files[0]);
      } else {
        alert("Please upload a valid CSV file.");
      }
    },
    [disabled, onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ${
        disabled ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-brand-500 hover:bg-brand-50 cursor-pointer'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${disabled ? 'bg-gray-200' : 'bg-brand-100'}`}>
          <UploadCloud className={`w-8 h-8 ${disabled ? 'text-gray-400' : 'text-brand-600'}`} />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-700">
            Drag & Drop your CSV file here
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse</p>
        </div>
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
             disabled ? 'bg-gray-400' : 'bg-brand-600 hover:bg-brand-700 cursor-pointer'
          }`}
        >
          Select File
        </label>
        <p className="text-xs text-gray-400">Supported format: .csv (Columns: BA, monthly, actCode, amount)</p>
      </div>
    </div>
  );
};