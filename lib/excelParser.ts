import { Reservation, Passenger, Flight, Transfer, Accommodation } from './types';

export function parseExcelFile(data: string[][]): Reservation[] {
  const reservations: Reservation[] = [];
  
  // Remove completely empty rows
  const cleanedRows = data.filter((row) => {
    return row && row.length > 0 && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '');
  });

  console.log('[v0] Parser received cleaned rows:', cleanedRows.length);

  let i = 0;
  while (i < cleanedRows.length) {
    const row = cleanedRows[i];
    const firstCol = String(row[0] || '').trim();

    // Check if this is a booking reference row (D-001, D-002, etc.)
    if (firstCol.match(/^D-\d+/)) {
      console.log('[v0] Found booking reference at row', i, ':', firstCol);
      const { reservation, nextIndex } = parseReservationBlock(cleanedRows, i);
      if (reservation && reservation.passengers.length > 0) {
        reservations.push(reservation);
      }
      i = nextIndex;
    } else {
      i++;
    }
  }

  console.log('[v0] Parser completed with', reservations.length, 'reservations');
  return reservations;
}

function parseReservationBlock(rows: string[][], startIndex: number): { reservation: Reservation | null; nextIndex: number } {
  const headerRow = rows[startIndex];
  const bookingReference = String(headerRow[0] || '').trim();
  
  // Find booking date, hotel name, and agency from the header row
  // Based on observation: 
  // Col 8 (index 8): Date
  // Col 19 (index 19): Hotel
  // Col 24 (index 24): Agency Info
  // Col 26 (index 26): Agency Name
  
  const bookingDate = String(headerRow[8] || '').trim() || new Date().toISOString().split('T')[0];
  const hotelName = String(headerRow[19] || '').trim();
  const agency = String(headerRow[26] || '').trim();
  const agencyCode = String(headerRow[24] || '').trim();

  const passengers: Passenger[] = [];
  const flights: Flight[] = [];
  const transfers: Transfer[] = [];
  const accommodations: Accommodation[] = [];

  let i = startIndex + 1;
  let state: 'header' | 'passengers' | 'flights' | 'transfers' | 'accommodations' = 'header';

  while (i < rows.length) {
    const row = rows[i];
    const firstCol = String(row[0] || '').trim();
    const firstColUpper = firstCol.toUpperCase();

    // Stop at next reservation
    if (firstCol.match(/^D-\d+/) && i !== startIndex) {
      break;
    }

    // State machine: identify sections
    if (firstColUpper === 'CIV') {
      state = 'passengers';
      i++;
      continue;
    }

    if (firstColUpper === 'VILLE DEPART') {
      state = 'flights';
      i++;
      continue;
    }

    if (firstColUpper.includes('TRANSFERT')) {
      state = 'transfers';
    } else if (firstColUpper.includes('HOTEL') || firstColUpper.includes('RESORT') || firstColUpper.includes('CHAMBRE')) {
      state = 'accommodations';
    }

    // Parse based on current state
    if (state === 'passengers') {
      const civility = firstColUpper;
      if (['MADAME', 'MONSIEUR', 'MLLE', 'M.', 'MME', 'MR'].includes(civility)) {
        // Based on observation: NOM is at index 8, PRENOM at index 19, AGE at index 23, DATE NAISSANCE at index 24
        const lastName = String(row[8] || '').trim();
        const firstName = String(row[19] || '').trim();
        
        if (lastName || firstName) {
          const passenger: Passenger = {
            civility: firstCol,
            lastName,
            firstName,
            age: row[23] ? tryParseInt(String(row[23])) : undefined,
            dateOfBirth: String(row[24] || '').trim() || undefined,
          };
          passengers.push(passenger);
        }
      }
    } else if (state === 'flights') {
      // Flights row: 
      // VILLE DEPART (0), IATA DEPART (1), DATE DEPART (5), HEURE DEPART (6), 
      // VILLE ARRIVÉE (7), IATA ARRIVÉE (10), DATE ARRIVÉE (11), HEURE ARRIVÉE (14), 
      // VOL (17), DATE EMI (19), INTITULÉ (24)
      if (row.length >= 18 && (isAirportCity(firstColUpper) || firstColUpper !== '')) {
        const flight: Flight = {
          departureCity: firstColUpper,
          departureIATA: String(row[1] || '').trim(),
          departureDate: String(row[5] || '').trim(),
          departureTime: String(row[6] || '').trim(),
          arrivalCity: String(row[7] || '').trim(),
          arrivalIATA: String(row[10] || '').trim(),
          arrivalDate: String(row[11] || '').trim(),
          arrivalTime: String(row[14] || '').trim(),
          flightNumber: String(row[17] || '').trim(),
          flightDate: String(row[19] || '').trim(),
          airline: extractAirline(String(row[24] || '')),
          description: String(row[24] || '').trim(),
        };
        if (flight.departureDate && flight.arrivalDate) {
          flights.push(flight);
        }
      }
    } else if (state === 'transfers') {
      // Transfer row: Description (0), In (13), Out (16)
      if (row[13] || row[16]) {
        const transfer: Transfer = {
          description: firstCol,
          checkInDate: String(row[13] || '').trim(),
          checkOutDate: String(row[16] || '').trim(),
        };
        transfers.push(transfer);
      }
    } else if (state === 'accommodations') {
      // Accommodation row: Description (0), In (13), Out (16)
      if (row[13] || row[16]) {
        const accommodation: Accommodation = {
          name: firstCol,
          roomType: '', // Could be parsed from description if needed
          checkInDate: String(row[13] || '').trim(),
          checkOutDate: String(row[16] || '').trim(),
        };
        accommodations.push(accommodation);
      }
    }

    i++;
  }

  if (passengers.length > 0) {
    const reservation: Reservation = {
      id: `${bookingReference}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookingReference,
      bookingDate,
      hotelName,
      agency,
      agencyCode,
      passengers,
      outboundFlight: flights[0] || ({} as Flight),
      returnFlight: flights[1] || ({} as Flight),
      transfers,
      accommodations,
      baggage: '',
      importDate: new Date().toISOString(),
    };
    
    return { reservation, nextIndex: i };
  }

  return { reservation: null, nextIndex: i };
}

function isAirportCity(text: string): boolean {
  const cities = new Set([
    'GENEVE', 'GENEVA', 'GVA',
    'PARIS', 'CDG', 'ORY', 'PARIS-ORLY',
    'LYON', 'LYS', 'LYON-BÂLE',
    'MARSEILLE', 'MRS',
    'TOULOUSE', 'TLS',
    'NICE', 'NCE',
    'DJERBA', 'DJE',
    'MONASTIR', 'MIR',
    'TUNIS', 'TUN', 'TUNISIA',
    'BERLIN', 'BER', 'BRU',
    'LONDON', 'LHR', 'LGW', 'STN',
    'AMSTERDAM', 'AMS',
    'ROME', 'FCO', 'CIA', 'ROM',
    'BARCELONA', 'BCN',
    'CASABLANCA', 'CMN',
    'AGADIR', 'AGA',
    'BORDEAUX', 'BOD',
    'NANTES', 'NTE',
    'STRASBOURG', 'SXB',
    'BÂLE', 'BSL',
    'RENNES', 'RNS',
    'TOULON', 'TLN',
    'PERPIGNAN', 'PGF'
  ]);
  return cities.has(text);
}

function tryParseInt(str: string): number | undefined {
  if (!str) return undefined;
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

function extractAirline(text: string): string {
  if (!text) return 'Unknown';
  const airlineMatch = text.match(/(?:EasyJet|EASYJET|easy jet|Tunisair|TUNISAIR|Air France|AIR FRANCE|Swiss|SWISS|Lufthansa|LUFTHANSA|British|BRITISH|KLM|Ryanair|RYANAIR)/i);
  if (airlineMatch) {
    return airlineMatch[0];
  }
  const match = text.match(/^([A-Z]+(?:\s+[A-Z]+)?)/);
  return match ? match[1] : 'Unknown';
}

export function filterReservations(
  reservations: Reservation[],
  type: 'all' | 'departure' | 'arrival',
  startDate?: string,
  endDate?: string,
  searchTerm?: string,
): Reservation[] {
  return reservations.filter((reservation) => {
    if (type === 'departure') {
      if (!reservation.outboundFlight?.departureDate) return false;
      const depDate = parseDate(reservation.outboundFlight.departureDate);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      if (isNaN(depDate.getTime()) || depDate < start || depDate > end) return false;
    } else if (type === 'arrival') {
      if (!reservation.returnFlight?.arrivalDate) return false;
      const arrDate = parseDate(reservation.returnFlight.arrivalDate);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      if (isNaN(arrDate.getTime()) || arrDate < start || arrDate > end) return false;
    } else if (type === 'all' && (startDate || endDate)) {
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      const depDate = parseDate(reservation.outboundFlight?.departureDate || '');
      const arrDate = parseDate(reservation.returnFlight?.arrivalDate || '');
      const depValid = !isNaN(depDate.getTime()) && depDate >= start && depDate <= end;
      const arrValid = !isNaN(arrDate.getTime()) && arrDate >= start && arrDate <= end;
      if (!depValid && !arrValid) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const searchableText = [
        reservation.bookingReference,
        reservation.hotelName,
        reservation.agency,
        ...reservation.passengers.map((p) => `${p.firstName || ''} ${p.lastName || ''}`),
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(term)) return false;
    }

    return true;
  });
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date('1900-01-01');
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(dateStr);
}
