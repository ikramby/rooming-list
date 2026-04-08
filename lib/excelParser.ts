import { Reservation, Passenger, Flight, Transfer, Accommodation } from './types';

export function parseExcelFile(data: string[][]): Reservation[] {
  const reservations: Reservation[] = [];
  
  // Remove completely empty rows
  const cleanedRows = data.filter((row) => {
    return row && row.length > 0 && row.some((cell) => cell && String(cell).trim() !== '');
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
        console.log('[v0] ✓ Parsed:', reservation.bookingReference, '-', reservation.passengers.length, 'passengers,', reservation.passengers.map(p => `${p.firstName} ${p.lastName}`).join('; '));
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
  const bookingDate = String(headerRow[1] || '').trim() || new Date().toISOString().split('T')[0];
  
  // Extract hotel name and agency from header row
  let hotelName = '';
  let agency = '';
  let agencyCode = '';
  
  for (let j = 2; j < Math.min(headerRow.length, 8); j++) {
    const val = String(headerRow[j] || '').trim();
    if (val) {
      if (!hotelName && (val.includes('Hotel') || val.includes('HOTEL') || val.includes('Resort') || val.includes('RESORT'))) {
        hotelName = val;
      }
      if (!agency && (val.includes('KARAVEL') || val.includes('Karavel'))) {
        agency = val;
      }
      if (!agencyCode && val.match(/\[\d+\]/)) {
        agencyCode = val;
      }
    }
  }

  const passengers: Passenger[] = [];
  const flights: Flight[] = [];
  const transfers: Transfer[] = [];
  const accommodations: Accommodation[] = [];

  let i = startIndex + 1;
  let state: 'header' | 'passengers' | 'flights' | 'transfers' | 'accommodations' = 'header';

  while (i < rows.length) {
    const row = rows[i];
    if (!row || row.length === 0) {
      i++;
      continue;
    }

    const firstCol = String(row[0] || '').trim();
    const firstColUpper = firstCol.toUpperCase();

    // Stop at next reservation
    if (firstCol.match(/^D-\d+/) && i !== startIndex) {
      break;
    }

    // State machine: identify sections
    if (firstColUpper === 'CIV') {
      console.log('[v0] Found CIV header at row', i);
      state = 'passengers';
      i++;
      continue;
    }

    if (firstColUpper === 'VILLE DEPART') {
      console.log('[v0] Found VILLE DEPART header at row', i);
      state = 'flights';
      i++;
      continue;
    }

    if (firstColUpper.includes('TRANSFERT')) {
      state = 'transfers';
    }

    if (firstColUpper.includes('HOTEL') || firstColUpper.includes('RESORT') || firstColUpper.includes('CHAMBRE')) {
      state = 'accommodations';
    }

    // Parse based on current state
    if (state === 'passengers' && firstCol) {
      const civility = firstColUpper;
      // Check if this is a valid civility value (case-insensitive matching)
      if (['MADAME', 'MONSIEUR', 'MLLE', 'M.', 'MME', 'MR'].includes(civility)) {
        const lastName = String(row[1] || '').trim();
        const firstName = String(row[2] || '').trim();
        
        if (lastName || firstName) {
          const passenger: Passenger = {
            civility: firstCol,
            lastName,
            firstName,
            age: row[3] ? tryParseInt(String(row[3])) : undefined,
            dateOfBirth: String(row[4] || '').trim() || undefined,
          };
          passengers.push(passenger);
          console.log('[v0] ✓ Passenger:', civility, firstName, lastName, 'Age:', passenger.age);
        }
      } else if (firstCol && !['NOM', 'PRENOM', 'AGE', 'DATE', 'NAISSANCE', 'DATEEMI', 'CODEROTATION'].some(h => civility.includes(h))) {
        // Non-passenger row without expected headers, switch state
        console.log('[v0] Exiting passengers state, found:', firstCol);
        state = 'header';
      }
    } else if (state === 'flights' && firstCol) {
      if (isAirportCity(firstColUpper) && row.length >= 9) {
        const flight: Flight = {
          departureCity: firstColUpper,
          departureIATA: String(row[1] || '').trim(),
          departureDate: String(row[2] || '').trim(),
          departureTime: String(row[3] || '').trim(),
          arrivalCity: String(row[4] || '').trim(),
          arrivalIATA: String(row[5] || '').trim(),
          arrivalDate: String(row[6] || '').trim(),
          arrivalTime: String(row[7] || '').trim(),
          flightNumber: String(row[8] || '').trim(),
          flightDate: String(row[9] || '').trim(),
          airline: extractAirline(String(row[row.length - 1] || '')),
          description: String(row[row.length - 1] || '').trim(),
        };
        flights.push(flight);
        console.log('[v0] ✓ Flight:', firstColUpper, '→', flight.arrivalCity, 'on', flight.departureDate);
      } else if (!isAirportCity(firstColUpper) && firstCol) {
        state = 'header';
      }
    } else if (state === 'transfers' && firstCol) {
      const transfer: Transfer = {
        description: firstCol,
        checkInDate: String(row[1] || '').trim(),
        checkOutDate: String(row[2] || '').trim(),
      };
      transfers.push(transfer);
      console.log('[v0] ✓ Transfer:', transfer.description);
    } else if (state === 'accommodations' && firstCol) {
      const accommodation: Accommodation = {
        name: firstCol,
        roomType: String(row[1] || '').trim(),
        checkInDate: String(row[2] || '').trim(),
        checkOutDate: String(row[3] || '').trim(),
      };
      accommodations.push(accommodation);
      console.log('[v0] ✓ Accommodation:', accommodation.name);
    }

    i++;
  }

  console.log('[v0] Reservation block summary:', {
    ref: bookingReference,
    passengersFound: passengers.length,
    flightsFound: flights.length,
    transfersFound: transfers.length,
    accommodationsFound: accommodations.length,
  });

  if (passengers.length > 0) {
    const reservation: Reservation = {
      id: `${bookingReference}-${Date.now()}`,
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
    
    console.log('[v0] ✓ Created reservation with', passengers.length, 'passengers');
    return { reservation, nextIndex: i };
  } else {
    console.log('[v0] ✗ No passengers found for booking', bookingReference);
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
  // Look for airline names/codes
  const airlineMatch = text.match(/(?:EasyJet|EASYJET|easy jet|Tunisair|TUNISAIR|Air France|AIR FRANCE|Swiss|SWISS|Lufthansa|LUFTHANSA|British|BRITISH|KLM|Ryanair|RYANAIR)/i);
  if (airlineMatch) {
    return airlineMatch[0];
  }
  // Fallback to extracting uppercase words at the beginning
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
    // Filter by type and date
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

    // Filter by search term
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
  // Handle formats like DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(dateStr);
}
