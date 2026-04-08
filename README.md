# Travel Reservation Manager

A modern web application for importing, managing, and exporting travel reservations from Excel files to PDF format.

## Features

- **Excel Import**: Drag-and-drop or select Excel files (.xlsx, .xls) to import travel reservations
- **Smart Parsing**: Automatically parses complex Excel structures containing passenger info, flights, accommodations, and transfers
- **Advanced Filtering**: Filter reservations by:
  - Trip type (All, Departure, Arrival)
  - Date range
  - Search terms (passenger names, booking references, hotel names)
- **PDF Export**: Generate professional PDF documents for individual reservations or all results
- **Dark Mode Support**: Fully responsive design with dark mode support
- **Real-time Updates**: Instant filtering and export capabilities

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19.2** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **xlsx** - Excel file parsing
- **jsPDF + html2canvas** - PDF generation

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Node.js** - Runtime environment

## Project Structure

```
app/
  ├── api/
  │   └── parse-excel/        # Excel parsing API endpoint
  │       └── route.ts
  ├── page.tsx                # Main page component
  └── layout.tsx              # Root layout with metadata
  
components/
  ├── ExcelImporter.tsx       # File upload and drag-drop
  ├── ReservationFilters.tsx  # Filter controls
  ├── ReservationsList.tsx    # List display
  └── ReservationCard.tsx     # Individual reservation details
  
lib/
  ├── types.ts                # TypeScript interfaces
  ├── excelParser.ts          # Excel parsing logic
  ├── pdfExporter.ts          # PDF generation
  └── utils.ts                # Utility functions
```

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
pnpm build
pnpm start
```

## Usage

### Step 1: Import Excel File
1. Click the import area or drag and drop an Excel file
2. The parser will automatically extract:
   - Booking reference and agency information
   - Passenger details
   - Flight information (departure and return)
   - Accommodations
   - Transfers

### Step 2: Filter Reservations
- Use the filter panel to narrow down results:
  - Select trip type
  - Choose date range
  - Search by name, booking reference, or hotel

### Step 3: Export to PDF
- Click the download icon on any reservation to export as PDF
- Or use "Export All" to download all visible reservations

## Excel File Format

The application expects Excel files with the following structure:
- Booking reference in first column (format: D-XXX XXXXXXX)
- Passenger information (Civility, Name, First Name, Age, DOB)
- Flight details (Departure/Arrival cities, times, dates, flight numbers)
- Accommodation details (Hotel name, room type, check-in/out dates)
- Transfer information

## API Endpoints

### POST `/api/parse-excel`
Parses an uploaded Excel file and returns structured reservation data.

**Request:**
- Content-Type: multipart/form-data
- Body: `file` (Excel file)

**Response:**
```json
{
  "success": true,
  "data": {
    "reservations": [...],
    "parseDate": "2026-04-07T...",
    "totalRecords": 5
  }
}
```

## Data Models

### Reservation
```typescript
{
  id: string
  bookingReference: string
  bookingDate: string
  hotelName: string
  agency: string
  agencyCode: string
  passengers: Passenger[]
  outboundFlight: Flight
  returnFlight: Flight
  transfers: Transfer[]
  accommodations: Accommodation[]
  baggage: string
  importDate: string
}
```

## Deployment

### Vercel
The application is optimized for deployment on Vercel:

1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy with zero configuration

### Environment Variables
No environment variables required for basic functionality.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Limitations

- Excel files should be properly formatted according to the expected structure
- PDF export works best in modern browsers
- Large files (1000+ reservations) may require pagination

## Future Enhancements

- Database integration for persistent storage
- User authentication and multi-user support
- Batch operations and scheduling
- Email integration for automated reports
- Advanced analytics and statistics
- Custom PDF templates

## License

MIT

## Support

For issues or feature requests, please open an issue on GitHub.
