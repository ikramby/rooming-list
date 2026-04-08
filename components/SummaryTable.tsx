'use client';

import { Reservation } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SummaryTableProps {
  reservations: Reservation[];
}

export function SummaryTable({ reservations }: SummaryTableProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h3 className="text-xl font-bold">Tableau Récapitulatif</h3>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimer le tableau
        </Button>
      </div>

      <div className="border rounded-md bg-white dark:bg-slate-900 overflow-hidden print:border-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-slate-800">
              <TableHead className="font-bold">Référence</TableHead>
              <TableHead className="font-bold">Passagers</TableHead>
              <TableHead className="font-bold">Départ (Ville / Date / Heure)</TableHead>
              <TableHead className="font-bold">Arrivée (Ville / Date / Heure)</TableHead>
              <TableHead className="font-bold">Hôtel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((res) => (
              <TableRow key={res.id}>
                <TableCell className="font-medium">{res.bookingReference}</TableCell>
                <TableCell>
                  <ul className="list-none p-0 m-0">
                    {res.passengers.map((p, idx) => (
                      <li key={idx} className="text-sm">
                        {p.civility} {p.lastName} {p.firstName}
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{res.outboundFlight?.departureCity || '-'}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(res.outboundFlight?.departureDate)} à {res.outboundFlight?.departureTime}
                  </div>
                  <div className="text-xs italic text-blue-600">{res.outboundFlight?.flightNumber}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{res.outboundFlight?.arrivalCity || '-'}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(res.outboundFlight?.arrivalDate)} à {res.outboundFlight?.arrivalTime}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{res.hotelName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
