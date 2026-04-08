export interface Passenger {
  civility: string;
  lastName: string;
  firstName: string;
  age?: number;
  dateOfBirth?: string;
}

export interface Flight {
  departureCity: string;
  departureIATA: string;
  departureDate: string;
  departureTime: string;
  arrivalCity: string;
  arrivalIATA: string;
  arrivalDate: string;
  arrivalTime: string;
  flightNumber: string;
  flightDate: string;
  airline: string;
  description: string;
}

export interface Transfer {
  description: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface Accommodation {
  name: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface Reservation {
  id: string;
  bookingReference: string;
  bookingDate: string;
  hotelName: string;
  agency: string;
  agencyCode: string;
  passengers: Passenger[];
  outboundFlight: Flight;
  returnFlight: Flight;
  transfers: Transfer[];
  accommodations: Accommodation[];
  baggage: string;
  importDate: string;
}

export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  type: 'all' | 'departure' | 'arrival';
  searchTerm?: string;
}

export interface ParsedData {
  reservations: Reservation[];
  parseDate: string;
  totalRecords: number;
}
