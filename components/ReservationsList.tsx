'use client';

import { Reservation } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { ReservationCard } from './ReservationCard';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

interface ReservationsListProps {
  reservations: Reservation[];
  onExportPDF: (reservation: Reservation) => void;
  isLoading?: boolean;
}

export function ReservationsList({ reservations, onExportPDF, isLoading }: ReservationsListProps) {
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
            onClick={() => {
              reservations.forEach((res) => onExportPDF(res));
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export All
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
