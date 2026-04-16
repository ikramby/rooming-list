'use client';

import { Reservation } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { ReservationCard } from './ReservationCard';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useState } from 'react';
import { exportMultipleReservationsToXLSX } from '@/lib/xlsxExporter'; // ← changed
import { useToast } from '@/hooks/use-toast';

interface ReservationsListProps {
  reservations: Reservation[];
  onExportPDF: (reservation: Reservation) => void;
  isLoading?: boolean;
  filterType?: 'departure' | 'arrival' | null;
  filterDate?: string | null;
}

export function ReservationsList({ 
  reservations, 
  onExportPDF, 
  isLoading, 
  filterType, 
  filterDate 
}: ReservationsListProps) {
  const [isExportingAll, setIsExportingAll] = useState(false);
  const { toast } = useToast();

  const handleExportAll = async () => {
    if (reservations.length === 0) return;
    setIsExportingAll(true);
    toast({
      title: 'Export Started',
      description: `Exporting ${reservations.length} reservation(s)...`,
    });
    try {
      exportMultipleReservationsToXLSX(  // ← changed (sync, no await needed)
        reservations,
        filterType || undefined,
        filterDate || undefined
      );
      toast({
        title: 'Export Complete',
        description: `Successfully exported ${reservations.length} reservation(s)`,
      });
    } catch (error) {
      console.error('Export all error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export reservations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingAll(false);
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading reservations...</p>
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No reservations found</EmptyTitle>
          <EmptyDescription>Import an Excel file or adjust your filters to see reservations</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{reservations.length} Reservation(s)</h2>
        {reservations.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportAll}
            disabled={isExportingAll}
            className="gap-2"
          >
            {isExportingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExportingAll ? 'Exporting...' : 'Exporter Tous en Excel'}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {reservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onExportPDF={onExportPDF}
          />
        ))}
      </div>
    </div>
  );
}