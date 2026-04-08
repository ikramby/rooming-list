import { Reservation } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportReservationToPDF(reservation: Reservation) {
  // Create a temporary HTML element
  const html = createReservationHTML(reservation);
  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.position = 'fixed';
  element.style.top = '-9999px';
  element.style.left = '-9999px';
  element.style.width = '210mm'; // A4 width
  element.style.backgroundColor = 'white';
  element.style.padding = '20px';
  element.style.fontSize = '12px';
  element.style.lineHeight = '1.5';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.zIndex = '-1';
  document.body.appendChild(element);

  try {
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add pages as needed
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height in mm

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`Reservation_${reservation.bookingReference}.pdf`);
  } finally {
    if (element.parentElement) {
      document.body.removeChild(element);
    }
  }
}

function createReservationHTML(reservation: Reservation): string {
  const passengersHTML = reservation.passengers
    .map(
      (p) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.civility}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.lastName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.firstName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.age || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.dateOfBirth || '-'}</td>
    </tr>
  `,
    )
    .join('');

  const flightHTML = (flight: any, title: string) => `
    <div style="margin-bottom: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">${title}</h3>
      <table style="width: 100%; font-size: 11px;">
        <tr>
          <td style="padding: 4px; font-weight: bold;">Departure:</td>
          <td style="padding: 4px;">${flight.departureCity} (${flight.departureIATA}) - ${formatDateForPDF(flight.departureDate)} ${flight.departureTime}</td>
        </tr>
        <tr>
          <td style="padding: 4px; font-weight: bold;">Arrival:</td>
          <td style="padding: 4px;">${flight.arrivalCity} (${flight.arrivalIATA}) - ${formatDateForPDF(flight.arrivalDate)} ${flight.arrivalTime}</td>
        </tr>
        ${flight.flightNumber ? `<tr><td style="padding: 4px; font-weight: bold;">Flight:</td><td style="padding: 4px;">${flight.flightNumber}</td></tr>` : ''}
        ${flight.airline ? `<tr><td style="padding: 4px; font-weight: bold;">Airline:</td><td style="padding: 4px;">${flight.airline}</td></tr>` : ''}
      </table>
    </div>
  `;

  const accommodationsHTML = reservation.accommodations
    .map(
      (acc) => `
    <div style="margin-bottom: 10px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #3b82f6;">
      <p style="margin: 0; font-weight: bold;">${acc.name}</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${acc.roomType}</p>
      <p style="margin: 4px 0 0 0; font-size: 11px;">Check-in: ${formatDateForPDF(acc.checkInDate)} | Check-out: ${formatDateForPDF(acc.checkOutDate)}</p>
    </div>
  `,
    )
    .join('');

  const transfersHTML = reservation.transfers
    .map(
      (trans) => `
    <div style="margin-bottom: 10px; padding: 10px; background-color: #f9fafb; border-left: 3px solid #10b981;">
      <p style="margin: 0; font-weight: bold;">${trans.description}</p>
      <p style="margin: 4px 0 0 0; font-size: 11px;">From: ${formatDateForPDF(trans.checkInDate)} | To: ${formatDateForPDF(trans.checkOutDate)}</p>
    </div>
  `,
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
        <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #1e40af;">Travel Reservation</h1>
        <p style="margin: 0; font-size: 12px; color: #666;">Booking Reference: <strong>${reservation.bookingReference}</strong></p>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <p style="margin: 0; font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase;">Hotel</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold;">${reservation.hotelName}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase;">Agency</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;">${reservation.agency} ${reservation.agencyCode ? `[${reservation.agencyCode}]` : ''}</p>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Passengers (${reservation.passengers.length})</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 11px; font-weight: bold;">Civility</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 11px; font-weight: bold;">Last Name</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 11px; font-weight: bold;">First Name</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 11px; font-weight: bold;">Age</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 11px; font-weight: bold;">DOB</th>
            </tr>
          </thead>
          <tbody>
            ${passengersHTML}
          </tbody>
        </table>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Flights</h2>
        ${flightHTML(reservation.outboundFlight, 'Outbound Flight')}
        ${flightHTML(reservation.returnFlight, 'Return Flight')}
      </div>

      ${reservation.accommodations.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="margin: 0 0 12px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Accommodations</h2>
          ${accommodationsHTML}
        </div>
      ` : ''}

      ${reservation.transfers.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="margin: 0 0 12px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Transfers</h2>
          ${transfersHTML}
        </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666; text-align: center;">
        <p style="margin: 0;">Generated on: ${formatDateForPDF(new Date().toISOString())}</p>
      </div>
    </div>
  `;
}

function formatDateForPDF(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
