import { Reservation, Passenger, Flight, Transfer, Accommodation, FilterOptions } from './types';

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
      i++;
      continue;
    } else if (firstColUpper.includes('HOTEL') || firstColUpper.includes('RESORT') || firstColUpper.includes('CHAMBRE')) {
      state = 'accommodations';
      i++;
      continue;
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
    'LYON', 'LYS', 'LYON-BALE',
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
    'BALE', 'BSL',
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

// Main parseFlightDate function with better error handling

function hasValidFlightDate(reservation: Reservation, type: 'departure' | 'arrival'): boolean {
  if (type === 'departure') {
    const flight = reservation.outboundFlight;
    return !!(flight && flight.departureDate && flight.departureDate.trim() !== '');
  } else {
    const flight = reservation.returnFlight;
    return !!(flight && flight.arrivalDate && flight.arrivalDate.trim() !== '');
  }
}
function parseFlightDate(dateString: string | undefined | null): Date {
  // Handle null/undefined/empty
  if (!dateString || dateString === 'undefined' || dateString === 'null' || dateString.trim() === '') {
    console.warn('Empty or invalid date string provided');
    return new Date(0); // Return epoch for invalid dates
  }
  
  try {
    // Handle DD/MM/YYYY format (common in French data)
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Months are 0-indexed
        const year = parseInt(parts[2]);
        
        // Validate numbers
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }
    
    // Handle YYYY-MM-DD format
    if (dateString.includes('-')) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try parsing as standard date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // If all else fails, try to extract date from string using regex
    const dateMatch = dateString.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = parseInt(dateMatch[3]);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    
    console.warn(`Could not parse date: ${dateString}`);
    return new Date(0); // Return epoch for invalid dates
  } catch (error) {
    console.error(`Error parsing date ${dateString}:`, error);
    return new Date(0);
  }
}
// Filter reservations function

export function filterReservations(
  reservations: Reservation[],
  type: 'all' | 'departure' | 'arrival',
  inDate?: string,
  outDate?: string,
  searchTerm?: string
): Reservation[] {
  let filtered = [...reservations];

  // Apply trip type and date filters
  if (type !== 'all') {
    filtered = filtered.filter((reservation) => {
      let flightToCheck;
      let dateToCheck;
      
      if (type === 'departure') {
        // OUTBOUND TRIP: Use outbound flight's DEPARTURE date
        flightToCheck = reservation.outboundFlight;
        dateToCheck = flightToCheck?.departureDate;
        
        if (!dateToCheck) {
          console.warn(`Reservation ${reservation.bookingReference} has no departure date`);
          return false;
        }
      } else {
        // RETURN TRIP (ARRIVAL): Use outbound flight's ARRIVAL date (when you reach destination)
        flightToCheck = reservation.outboundFlight;
        dateToCheck = flightToCheck?.arrivalDate;
        
        if (!dateToCheck) {
          console.warn(`Reservation ${reservation.bookingReference} has no arrival date`);
          return false;
        }
      }
      
      // Check if flight exists
      if (!flightToCheck) {
        console.warn(`Reservation ${reservation.bookingReference} has no flight`);
        return false;
      }
      
      // Parse the date
      const flightDate = parseFlightDate(dateToCheck);
      
      // Check if date is valid
      if (flightDate.getTime() === 0 || isNaN(flightDate.getTime())) {
        console.warn(`Invalid date for ${reservation.bookingReference}: ${dateToCheck}`);
        return false;
      }
      
      // Apply date filter
      if (type === 'departure' && outDate) {
        // Filter outbound flights by departure date
        const filterDate = new Date(outDate);
        if (isNaN(filterDate.getTime())) return true;
        filterDate.setHours(0, 0, 0, 0);
        const flightDateStart = new Date(flightDate);
        flightDateStart.setHours(0, 0, 0, 0);
        return flightDateStart.getTime() === filterDate.getTime();
      } else if (type === 'arrival' && inDate) {
        // Filter outbound flights by arrival date at destination
        const filterDate = new Date(inDate);
        if (isNaN(filterDate.getTime())) return true;
        filterDate.setHours(0, 0, 0, 0);
        const flightDateStart = new Date(flightDate);
        flightDateStart.setHours(0, 0, 0, 0);
        return flightDateStart.getTime() === filterDate.getTime();
      }
      
      return true;
    });
  }

  // Apply search filter if provided
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (reservation) =>
        (reservation.bookingReference?.toLowerCase().includes(term) || false) ||
        (reservation.hotelName?.toLowerCase().includes(term) || false) ||
        (reservation.agency?.toLowerCase().includes(term) || false) ||
        (reservation.passengers?.some(
          (p) =>
            (p.firstName?.toLowerCase().includes(term) || false) ||
            (p.lastName?.toLowerCase().includes(term) || false)
        ) || false) ||
        (reservation.outboundFlight?.flightNumber?.toLowerCase().includes(term) || false) ||
        (reservation.returnFlight?.flightNumber?.toLowerCase().includes(term) || false)
    );
  }

  return filtered;
}
// Helper function for other date parsing needs
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date('1900-01-01');

  // Handle DD/MM/YYYY format (French format)
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      if (day && month && year && !isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
        return new Date(`${year}-${month}-${day}`);
      }
    }
  }

  return new Date(dateStr);
}