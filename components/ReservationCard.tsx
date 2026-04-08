'use client';

import { Reservation } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';

interface ReservationCardProps {
  reservation: Reservation;
  onExportPDF: (reservation: Reservation) => void;
}

export function ReservationCard({ reservation, onExportPDF }: ReservationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-pointer hover:opacity-95"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm opacity-90">Booking Reference</p>
              <p className="text-lg font-semibold">{reservation.bookingReference}</p>
            </div>
            <div className="hidden sm:block border-l border-white/30 pl-4">
              <p className="text-sm opacity-90">Hotel</p>
              <p className="font-medium">{reservation.hotelName}</p>
            </div>
            <div className="hidden md:block border-l border-white/30 pl-4">
              <p className="text-sm opacity-90">Passengers</p>
              <p className="font-medium">{reservation.passengers.length}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onExportPDF(reservation);
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Details */}
      {isExpanded && (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-slate-900">
          {/* Agency & Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Agency</p>
              <p className="text-sm mt-1">
                {reservation.agency} {reservation.agencyCode && `[${reservation.agencyCode}]`}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Booking Date</p>
              <p className="text-sm mt-1">{formatDate(reservation.bookingDate)}</p>
            </div>
          </div>

          {/* Passengers */}
          <div>
            <h4 className="font-semibold mb-3">Passengers ({reservation.passengers.length})</h4>
            <div className="space-y-2">
              {reservation.passengers.map((passenger, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded border">
                  <p className="text-sm">
                    <span className="font-medium">
                      {passenger.civility} {passenger.lastName} {passenger.firstName}
                    </span>
                    {passenger.age && <span className="text-gray-500 ml-2">Age: {passenger.age}</span>}
                  </p>
                  {passenger.dateOfBirth && (
                    <p className="text-xs text-gray-500 mt-1">Born: {formatDate(passenger.dateOfBirth)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Flights */}
          <div className="grid md:grid-cols-2 gap-4">
            {reservation.outboundFlight && (
              <FlightInfo
                flight={reservation.outboundFlight}
                title="Outbound Flight"
              />
            )}
            {reservation.returnFlight && (
              <FlightInfo
                flight={reservation.returnFlight}
                title="Return Flight"
              />
            )}
          </div>

          {/* Accommodations */}
          {reservation.accommodations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Accommodations</h4>
              <div className="space-y-2">
                {reservation.accommodations.map((acc, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded border">
                    <p className="font-medium text-sm">{acc.name}</p>
                    {acc.roomType && <p className="text-xs text-gray-500">{acc.roomType}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Check-in: {formatDate(acc.checkInDate)} | Check-out: {formatDate(acc.checkOutDate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transfers */}
          {reservation.transfers.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Transfers</h4>
              <div className="space-y-2">
                {reservation.transfers.map((transfer, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded border">
                    <p className="font-medium text-sm">{transfer.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      From: {formatDate(transfer.checkInDate)} | To: {formatDate(transfer.checkOutDate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function FlightInfo({ flight, title }: { flight: any; title: string }) {
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border">
      <h5 className="font-semibold text-sm mb-3">{title}</h5>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Departure:</span>
          <span className="font-medium">
            {flight.departureCity} ({flight.departureIATA}) - {formatDate(flight.departureDate)} {flight.departureTime}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Arrival:</span>
          <span className="font-medium">
            {flight.arrivalCity} ({flight.arrivalIATA}) - {formatDate(flight.arrivalDate)} {flight.arrivalTime}
          </span>
        </div>
        {flight.flightNumber && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Flight Number:</span>
            <span className="font-medium">{flight.flightNumber}</span>
          </div>
        )}
        {flight.airline && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Airline:</span>
            <span className="font-medium">{flight.airline}</span>
          </div>
        )}
      </div>
    </div>
  );
}
