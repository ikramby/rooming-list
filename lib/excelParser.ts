/**
 * excelParser.ts
 *
 * Supports two rooming-list XLS layouts that differ in flight column positions.
 * Format is auto-detected from the VILLE DEPART header row found in each block.
 *
 * FORMAT A (e.g. rooming.xls)
 *   0=VILLE DEPART, 1=IATA DEPART, 5=DATE DEPART, 6=HEURE DEPART,
 *   7=VILLE ARRIVÉE, 10=IATA ARRIVÉE, 11=DATE ARRIVÉE, 14=HEURE ARRIVÉE,
 *   17=VOL, 19=DATE EMI, 24=INTITULÉ, 22=bagages
 *   Passenger: dateOfBirth=col 24  |  Booking: agencyLabel=24, agencyShort=26
 *
 * FORMAT B (e.g. rooming11avril.xls)
 *   0=VILLE DEPART, 2=IATA DEPART, 5=DATE DEPART, 7=HEURE DEPART,
 *   10=VILLE ARRIVÉE, 11=IATA ARRIVÉE, 15=DATE ARRIVÉE, 18=HEURE ARRIVÉE,
 *   20=VOL, 21=DATE EMI, 25=INTITULÉ, 27=bagages
 *   Passenger: dateOfBirth=col 25  |  Booking: agencyLabel=25, agencyShort=28
 *
 * Detection key: if col[1] of the VILLE DEPART header row === "IATA DEPART" → Format A,
 *                if col[2] === "IATA DEPART" → Format B.
 */

import {
  Reservation,
  Passenger,
  Flight,
  Transfer,
  Accommodation,
  FilterOptions,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Column-map types
// ─────────────────────────────────────────────────────────────────────────────

interface FlightCols {
  departureIATA: number;
  departureDate: number;
  departureTime: number;
  arrivalCity: number;
  arrivalIATA: number;
  arrivalDate: number;
  arrivalTime: number;
  flightNumber: number;
  flightDate: number;
  description: number;
  baggage: number;
}

interface BookingCols {
  bookingDate: number;
  hotelName: number;
  agencyLabel: number;
  agencyShort: number;
}

interface PaxCols {
  lastName: number;
  firstName: number;
  age: number;
  dateOfBirth: number;
}

interface FormatMap {
  flight: FlightCols;
  booking: BookingCols;
  pax: PaxCols;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format definitions (verified against real files)
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_A: FormatMap = {
  flight: {
    departureIATA: 1,
    departureDate: 5,
    departureTime: 6,
    arrivalCity: 7,
    arrivalIATA: 10,
    arrivalDate: 11,
    arrivalTime: 14,
    flightNumber: 17,
    flightDate: 19,
    description: 24,
    baggage: 22,
  },
  booking: { bookingDate: 8, hotelName: 19, agencyLabel: 24, agencyShort: 26 },
  pax: { lastName: 8, firstName: 19, age: 23, dateOfBirth: 24 },
};

const FORMAT_B: FormatMap = {
  flight: {
    departureIATA: 2,
    departureDate: 5,
    departureTime: 7,
    arrivalCity: 10,
    arrivalIATA: 11,
    arrivalDate: 15,
    arrivalTime: 18,
    flightNumber: 20,
    flightDate: 21,
    description: 25,
    baggage: 27,
  },
  booking: { bookingDate: 8, hotelName: 19, agencyLabel: 25, agencyShort: 28 },
  pax: { lastName: 8, firstName: 19, age: 23, dateOfBirth: 25 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function cell(row: string[], index: number): string {
  return String(row[index] ?? '').trim();
}

function tryParseInt(s: string): number | undefined {
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}

/**
 * Parse any date variant → midnight local Date.
 * Handles: DD/MM/YYYY, YYYY-MM-DD, "2026-03-17 00:00:00" (pandas datetime).
 * Returns new Date(0) on failure.
 */
export function parseDate(s: string | undefined | null): Date {
  if (!s || s === 'undefined' || s === 'null') return new Date(0);
  const c = s.trim();
  if (!c) return new Date(0);

  // DD/MM/YYYY
  const slash = c.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));

  // YYYY-MM-DD (also handles pandas "2026-03-17 00:00:00")
  const iso = c.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const fallback = new Date(c);
  return isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

/** Convert any date string → canonical DD/MM/YYYY, or '' if unparseable */
function normalizeDate(raw: string): string {
  if (!raw) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw; // already correct
  const d = parseDate(raw);
  if (d.getTime() === 0) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function extractAirline(description: string): string {
  if (!description) return 'Unknown';
  const m = description.match(
    /\b(Tunisair|TUNISAIR|Transavia|TRANSAVIA|EASY JET|EasyJet|EASYJET|Air France|AIR FRANCE|Swiss|SWISS|Lufthansa|LUFTHANSA|British Airways|KLM|Ryanair|RYANAIR)\b/i,
  );
  return m ? m[1] : description.split(' ')[0] || 'Unknown';
}

/**
 * Detect format from a VILLE DEPART header row.
 * Key: if cell[1] === "IATA DEPART" → Format A; otherwise Format B.
 */
function detectFormatFromFlightHeader(row: string[]): FormatMap {
  return String(row[1] ?? '').trim().toUpperCase() === 'IATA DEPART' ? FORMAT_A : FORMAT_B;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function parseExcelFile(data: string[][]): Reservation[] {
  const rows = data.filter((row) =>
    row?.some((c) => c !== null && c !== undefined && String(c).trim() !== ''),
  );

  const reservations: Reservation[] = [];
  let i = 0;

  while (i < rows.length) {
    if (String(rows[i][0] ?? '').trim().match(/^D-\d+/)) {
      const { reservation, nextIndex } = parseBlock(rows, i);
      if (reservation) reservations.push(reservation);
      i = nextIndex;
    } else {
      i++;
    }
  }

  console.log(`[excelParser] Parsed ${reservations.length} reservations`);
  return reservations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Block parser
// ─────────────────────────────────────────────────────────────────────────────

// Internal type: passenger row buffered before format is known
type RawPassengerRow = {
  civility: string;
  row: string[];
};

function parseBlock(
  rows: string[][],
  startIndex: number,
): { reservation: Reservation | null; nextIndex: number } {
  const headerRow = rows[startIndex];
  const bookingReference = cell(headerRow, 0);

  let fmt: FormatMap | null = null; // resolved when we hit VILLE DEPART
  let hotelName = '';
  let agencyLabel = '';
  let agencyShort = '';
  let bookingDate = '';

  // We buffer raw passenger rows because they appear BEFORE the VILLE DEPART
  // header (which tells us which format to use for dateOfBirth column).
  const rawPaxRows: RawPassengerRow[] = [];

  const passengers: Passenger[] = [];
  const flights: Flight[] = [];
  const transfers: Transfer[] = [];
  const accommodations: Accommodation[] = [];

  type Section = 'none' | 'passengers' | 'flights' | 'services';
  let section: Section = 'none';

  let i = startIndex + 1;

  while (i < rows.length) {
    const row = rows[i];
    const col0 = cell(row, 0);
    const col0up = col0.toUpperCase();

    // Next booking block → stop
    if (col0.match(/^D-\d+/)) break;

    // ── Section markers ────────────────────────────────────────────────────

    if (col0up === 'CIV') {
      section = 'passengers';
      i++;
      continue;
    }

    if (col0up === 'VILLE DEPART') {
      fmt = detectFormatFromFlightHeader(row);

      // Resolve booking header cols now that format is known
      hotelName = cell(headerRow, fmt.booking.hotelName);
      agencyLabel = cell(headerRow, fmt.booking.agencyLabel);
      agencyShort = cell(headerRow, fmt.booking.agencyShort);
      bookingDate = normalizeDate(cell(headerRow, fmt.booking.bookingDate));

      // Flush buffered passenger rows with correct dateOfBirth column
      for (const { civility, row: pr } of rawPaxRows) {
        const lastName = cell(pr, fmt.pax.lastName);
        const firstName = cell(pr, fmt.pax.firstName);
        if (lastName || firstName) {
          passengers.push({
            civility,
            lastName,
            firstName,
            age: tryParseInt(cell(pr, fmt.pax.age)),
            dateOfBirth: normalizeDate(cell(pr, fmt.pax.dateOfBirth)) || undefined,
          });
        }
      }
      rawPaxRows.length = 0;

      section = 'flights';
      i++;
      continue;
    }

    // "In / Out" service header row
    if (!col0 && cell(row, 13).toUpperCase() === 'IN') {
      section = 'services';
      i++;
      continue;
    }

    // ── Row data ────────────────────────────────────────────────────────────

    if (section === 'passengers') {
      if (['MADAME', 'MONSIEUR', 'MLLE', 'M.', 'MME', 'MR'].includes(col0up)) {
        if (!fmt) {
          // Format not yet known → buffer for later
          rawPaxRows.push({ civility: col0, row });
        } else {
          const lastName = cell(row, fmt.pax.lastName);
          const firstName = cell(row, fmt.pax.firstName);
          if (lastName || firstName) {
            passengers.push({
              civility: col0,
              lastName,
              firstName,
              age: tryParseInt(cell(row, fmt.pax.age)),
              dateOfBirth: normalizeDate(cell(row, fmt.pax.dateOfBirth)) || undefined,
            });
          }
        }
      }
    } else if (section === 'flights' && fmt) {
      const depDate = normalizeDate(cell(row, fmt.flight.departureDate));
      const arrDate = normalizeDate(cell(row, fmt.flight.arrivalDate));
      if (depDate && arrDate) {
        const desc = cell(row, fmt.flight.description);
        flights.push({
          departureCity: col0,
          departureIATA: cell(row, fmt.flight.departureIATA),
          departureDate: depDate,
          departureTime: cell(row, fmt.flight.departureTime),
          arrivalCity: cell(row, fmt.flight.arrivalCity),
          arrivalIATA: cell(row, fmt.flight.arrivalIATA),
          arrivalDate: arrDate,
          arrivalTime: cell(row, fmt.flight.arrivalTime),
          flightNumber: cell(row, fmt.flight.flightNumber),
          flightDate: normalizeDate(cell(row, fmt.flight.flightDate)),
          airline: extractAirline(desc),
          description: desc,
        });
      }
    } else if (section === 'services') {
      const checkIn = normalizeDate(cell(row, 13));
      const checkOut = normalizeDate(cell(row, 16));
      if (checkIn || checkOut) {
        if (col0up.includes('TRANSFERT') || col0up.includes('TRANSFER')) {
          transfers.push({ description: col0, checkInDate: checkIn, checkOutDate: checkOut });
        } else {
          accommodations.push({ name: col0, roomType: '', checkInDate: checkIn, checkOutDate: checkOut });
        }
      }
    }

    i++;
  }

  if (passengers.length === 0 && rawPaxRows.length === 0) {
    return { reservation: null, nextIndex: i };
  }

  // If fmt was never resolved (block had no VILLE DEPART), use Format A as fallback
  if (!fmt) {
    fmt = FORMAT_A;
    hotelName = cell(headerRow, fmt.booking.hotelName);
    agencyLabel = cell(headerRow, fmt.booking.agencyLabel);
    agencyShort = cell(headerRow, fmt.booking.agencyShort);
    bookingDate = normalizeDate(cell(headerRow, fmt.booking.bookingDate));
    for (const { civility, row: pr } of rawPaxRows) {
      const lastName = cell(pr, fmt.pax.lastName);
      const firstName = cell(pr, fmt.pax.firstName);
      if (lastName || firstName) {
        passengers.push({
          civility,
          lastName,
          firstName,
          age: tryParseInt(cell(pr, fmt.pax.age)),
          dateOfBirth: normalizeDate(cell(pr, fmt.pax.dateOfBirth)) || undefined,
        });
      }
    }
  }

  const reservation: Reservation = {
    id: `${bookingReference}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    bookingReference,
    bookingDate,
    hotelName,
    agency: agencyShort || agencyLabel,
    agencyCode: agencyLabel,
    passengers,
    outboundFlight: flights[0] ?? ({} as Flight),
    returnFlight: flights[1] ?? ({} as Flight),
    transfers,
    accommodations,
    baggage: '',
    importDate: new Date().toISOString(),
  };

  return { reservation, nextIndex: i };
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stored dates: DD/MM/YYYY.
 * Filter values (inDate/outDate): YYYY-MM-DD from HTML <input type="date">.
 * Both normalised via parseDate() before comparison.
 */
export function filterReservations(
  reservations: Reservation[],
  type: 'all' | 'departure' | 'arrival',
  inDate?: string,
  outDate?: string,
  searchTerm?: string,
): Reservation[] {
  let result = reservations;

  if (type !== 'all') {
    const filterDate = parseDate(type === 'departure' ? outDate : inDate);
    const hasDateFilter = filterDate.getTime() !== 0;

    result = result.filter((r) => {
      const flight = r.outboundFlight;
      if (!flight) return false;
      const rawDate = type === 'departure' ? flight.departureDate : flight.arrivalDate;
      if (!rawDate) return false;
      const fd = parseDate(rawDate);
      if (fd.getTime() === 0) return false;
      if (!hasDateFilter) return true;
      return sameDay(fd, filterDate);
    });
  }

  if (searchTerm?.trim()) {
    const term = searchTerm.toLowerCase();
    result = result.filter(
      (r) =>
        r.bookingReference?.toLowerCase().includes(term) ||
        r.hotelName?.toLowerCase().includes(term) ||
        r.agency?.toLowerCase().includes(term) ||
        r.passengers?.some(
          (p) =>
            p.firstName?.toLowerCase().includes(term) ||
            p.lastName?.toLowerCase().includes(term),
        ) ||
        r.outboundFlight?.flightNumber?.toLowerCase().includes(term) ||
        r.returnFlight?.flightNumber?.toLowerCase().includes(term),
    );
  }

  return result;
}