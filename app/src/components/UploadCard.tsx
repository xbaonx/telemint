import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { validateFile } from '../lib/ipfs';
import { telegram } from '../lib/telegram';

interface UploadCardProps {
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
}

export function UploadCard({
  onFileSelected,
  onFileRemoved,
  selectedFile,
  previewUrl,
}: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      telegram.showAlert(validation.error || 'Invalid file');
      telegram.haptic('error');
      return;
    }

    telegram.haptic('success');
    onFileSelected(file);
  };

  const handleRemove = () => {
    telegram.haptic('light');
    onFileRemoved();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    telegram.haptic('light');
    fileInputRef.current?.click();
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Image</h2>

      {!selectedFile ? (
        <div
          className={`upload-zone ${isDragging ? 'upload-zone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-1">
              Drop your image here or click to browse
            </p>
            <p className="text-sm text-gray-400">
              JPG, PNG, GIF, or WebP (max 5MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative rounded-xl overflow-hidden bg-gray-100">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full 
                     hover:bg-red-600 active:bg-red-700 shadow-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 truncate">
              <span className="font-medium">File:</span> {selectedFile.name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Size:</span>{' '}
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
