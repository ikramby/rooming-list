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
      return NextResponse.json(
        { error: 'Invalid file format. Please upload an Excel file (.xlsx or .xls).' },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // sheet_to_json with header:1 returns raw rows as string[][]
    // raw:false lets XLSX format dates as strings rather than serial numbers
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,        // dates become "DD/MM/YYYY" strings when possible
      dateNF: 'DD/MM/YYYY',
    }) as string[][];

    console.log(`[route] Raw Excel rows: ${data.length}, file: ${file.name}`);

    // Parse → normalised Reservation[]  (all dates stored as DD/MM/YYYY)
    const reservations = parseExcelFile(data);

    console.log(`[route] Parsed ${reservations.length} reservations`);

    if (reservations.length > 0) {
      // Log the first reservation as JSON so you can inspect the structure
      console.log('[route] First reservation JSON:\n', JSON.stringify(reservations[0], null, 2));
    }

    if (reservations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No valid reservations found. Ensure the file contains booking references (D-001, D-002 …) and passenger rows.',
        },
        { status: 422 },
      );
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
    console.error('[route] Excel parsing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Excel file',
      },
      { status: 500 },
    );
  }
}