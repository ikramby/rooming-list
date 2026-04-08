import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/excelParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file format. Please upload an Excel file.' }, { status: 400 });
    }

    // Convert file to array buffer
    const buffer = await file.arrayBuffer();

    // Use dynamic import for xlsx to avoid issues in Next.js
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    // Log the raw data for debugging
    console.log('[v0] Excel sheet rows:', data.length);
    if (data.length > 0) {
      console.log('[v0] First 5 rows:', data.slice(0, 5).map((row, i) => `Row ${i}: ${row.slice(0, 3).join(' | ')}`));
    }

    // Parse the data using our custom parser
    const reservations = parseExcelFile(data);
    console.log('[v0] Parsed reservations:', reservations.length);
    if (reservations.length > 0) {
      console.log('[v0] First reservation:', {
        bookingRef: reservations[0].bookingReference,
        passengers: reservations[0].passengers.length,
        flights: reservations[0].outboundFlight?.departureCity,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          reservations,
          parseDate: new Date().toISOString(),
          totalRecords: reservations.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[v0] Excel parsing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Excel file',
      },
      { status: 500 },
    );
  }
}
