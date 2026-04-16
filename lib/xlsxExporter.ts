// lib/xlsxExporter.ts

import { Reservation } from './types';
import * as XLSX from 'xlsx';

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  try {
    if (dateString.includes('/')) return dateString;
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toLocaleDateString('fr-FR');
    return dateString;
  } catch {
    return dateString;
  }
}

function generateFilename(reservations: Reservation[], type?: string, date?: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (reservations.length === 1) {
    if (type === 'departure' && date) return `reservation_depart_${date}_${reservations[0].bookingReference}.xlsx`;
    if (type === 'arrival' && date) return `reservation_arrivee_${date}_${reservations[0].bookingReference}.xlsx`;
    return `reservation_${reservations[0].bookingReference}.xlsx`;
  } else {
    if (type === 'departure' && date) return `reservations_depart_${date}_${reservations.length}_voyageurs.xlsx`;
    if (type === 'arrival' && date) return `reservations_arrivee_${date}_${reservations.length}_voyageurs.xlsx`;
    return `reservations_${today}_${reservations.length}_voyageurs.xlsx`;
  }
}

function reservationsToRows(reservations: Reservation[], filterType?: string, filterDate?: string) {
  const rows: Record<string, string>[] = [];

  for (const r of reservations) {
    for (const p of r.passengers) {
      rows.push({
        'Booking Reference': r.bookingReference,
        'Booking Date': formatDate(r.bookingDate),
        'Hotel': r.hotelName || 'N/A',
        'Agency': r.agency || 'N/A',
        'Agency Code': r.agencyCode || 'N/A',
        'Filter Type': filterType || '',
        'Filter Date': filterDate ? formatDate(filterDate) : '',
        // Passenger
        'Civility': p.civility || '',
        'First Name': p.firstName || '',
        'Last Name': p.lastName || '',
        'Age': p.age?.toString() || '',
        'Date of Birth': formatDate(p.dateOfBirth),
        // Outbound
        'Outbound From': `${r.outboundFlight.departureCity || 'N/A'} (${r.outboundFlight.departureIATA || 'N/A'})`,
        'Outbound Departure Date': formatDate(r.outboundFlight.departureDate),
        'Outbound Departure Time': r.outboundFlight.departureTime || 'N/A',
        'Outbound To': `${r.outboundFlight.arrivalCity || 'N/A'} (${r.outboundFlight.arrivalIATA || 'N/A'})`,
        'Outbound Arrival Date': formatDate(r.outboundFlight.arrivalDate),
        'Outbound Arrival Time': r.outboundFlight.arrivalTime || 'N/A',
        'Outbound Flight Number': r.outboundFlight.flightNumber || 'N/A',
        'Outbound Airline': r.outboundFlight.airline || 'N/A',
        // Return
        'Return From': `${r.returnFlight.departureCity || 'N/A'} (${r.returnFlight.departureIATA || 'N/A'})`,
        'Return Departure Date': formatDate(r.returnFlight.departureDate),
        'Return Departure Time': r.returnFlight.departureTime || 'N/A',
        'Return To': `${r.returnFlight.arrivalCity || 'N/A'} (${r.returnFlight.arrivalIATA || 'N/A'})`,
        'Return Arrival Date': formatDate(r.returnFlight.arrivalDate),
        'Return Arrival Time': r.returnFlight.arrivalTime || 'N/A',
        'Return Flight Number': r.returnFlight.flightNumber || 'N/A',
        'Return Airline': r.returnFlight.airline || 'N/A',
      });
    }
  }

  return rows;
}

export function exportReservationToXLSX(
  reservation: Reservation,
  filterType?: string,
  filterDate?: string
): void {
  const rows = reservationsToRows([reservation], filterType, filterDate);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservation');
  XLSX.writeFile(wb, generateFilename([reservation], filterType, filterDate));
}

export function exportMultipleReservationsToXLSX(
  reservations: Reservation[],
  filterType?: string,
  filterDate?: string
): void {
  if (reservations.length === 0) throw new Error('No reservations to export');
  const rows = reservationsToRows(reservations, filterType, filterDate);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
  XLSX.writeFile(wb, generateFilename(reservations, filterType, filterDate));
}