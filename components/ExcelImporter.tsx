'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { ParsedData, Reservation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExcelImporterProps {
  onDataLoaded: (data: Reservation[]) => void;
}

export function ExcelImporter({ onDataLoaded }: ExcelImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Please upload an Excel file (.xlsx or .xls)');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse Excel file');
      }

      const result = await response.json();
      
      if (!result.data || !result.data.reservations) {
        const errorMsg = result.error || 'No valid reservations found in the file. Please ensure your Excel file contains:• Booking references (D-001, D-002, etc.)• Passenger data with civility (Madame, Monsieur, etc.)• Flight information (departure city, date, time, etc.)';
        setError(errorMsg);
        console.log('[v0] Result received:', result);
        return;
      }

      const parsedData: ParsedData = result.data;

      if (parsedData.reservations.length === 0) {
        const errorMsg = 'No valid reservations found in the file. Please ensure your Excel file contains booking references (D-001, D-002, etc.) and passenger data.';
        setError(errorMsg);
        console.log('[v0] Empty reservations from result:', result);
        return;
      }

      console.log('[v0] Successfully loaded:', parsedData.totalRecords, 'reservations');
      setSuccess(`Successfully imported ${parsedData.totalRecords} reservation(s)`);
      onDataLoaded(parsedData.reservations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while importing the file');
      console.error('[v0] Import error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Importer Fichier Excel</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
Glissez-déposez votre fichier Excel ici ou cliquez pour parcourir          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            disabled={isLoading}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? 'Processing...' : 'Choose File'}
          </Button>

          <p className="text-xs text-gray-500">Supported formats: .xlsx, .xls</p>
        </div>
      </Card>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-200">Import Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-200">Success</p>
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}
    </div>
  );
}
