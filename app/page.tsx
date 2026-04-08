'use client';

import { useState } from 'react';
import { Reservation, FilterOptions } from '@/lib/types';
import { filterReservations } from '@/lib/excelParser';
import { exportReservationToPDF } from '@/lib/pdfExporter';
import { ExcelImporter } from '@/components/ExcelImporter';
import { ReservationFilters } from '@/components/ReservationFilters';
import { ReservationsList } from '@/components/ReservationsList';
import { SummaryTable } from '@/components/SummaryTable';
import { Plane, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
  });
  const { toast } = useToast();

  const filteredReservations = filterReservations(
    reservations,
    filters.type,
    filters.inDate,
    filters.outDate,
    filters.searchTerm,
  );

  const handleDataLoaded = (data: Reservation[]) => {
    setReservations(data);
    setFilters({ type: 'all' });
    toast({
      title: 'Success',
      description: `Imported ${data.length} reservation(s)`,
    });
  };

  const handleExportPDF = async (reservation: Reservation) => {
    try {
      await exportReservationToPDF(reservation);
      toast({
        title: 'PDF Exported',
        description: `Reservation ${reservation.bookingReference} has been saved`,
      });
    } catch (error) {
      console.error('[v0] PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Plane className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Travel Reservation Manager
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Import, manage, and export your travel reservations in PDF format
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Import Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Step 1: Import Excel File</h2>
            <ExcelImporter onDataLoaded={handleDataLoaded} />
          </section>

          {/* Filters and Results */}
          {reservations.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Step 2: Filter & Export</h2>

              <div className="grid lg:grid-cols-4 gap-6">
                {/* Filters */}
                <div>
                  <ReservationFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>

                {/* Results */}
                <div className="lg:col-span-3">
                  <Tabs defaultValue="list" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold">Results ({filteredReservations.length})</h2>
                      <TabsList>
                        <TabsTrigger value="list" className="gap-2">
                          <LayoutGrid className="h-4 w-4" />
                          List
                        </TabsTrigger>
                        <TabsTrigger value="table" className="gap-2">
                          <TableIcon className="h-4 w-4" />
                          Table
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="list" className="mt-0">
                      <ReservationsList
                        reservations={filteredReservations}
                        onExportPDF={handleExportPDF}
                      />
                    </TabsContent>
                    <TabsContent value="table" className="mt-0 print-container">
                      <SummaryTable reservations={filteredReservations} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}


