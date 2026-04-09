// lib/pdfExporter.ts

import { Reservation } from './types';
import jsPDF from 'jspdf';

// Function to format date
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  try {
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('fr-FR');
    }
    return dateString;
  } catch {
    return dateString;
  }
}

// Function to format time
function formatTime(timeString: string | undefined): string {
  if (!timeString) return 'N/A';
  return timeString;
}

// Function to generate filename based on filter
function generateFilename(reservations: Reservation[], type?: string, date?: string): string {
  const today = new Date().toISOString().split('T')[0];
  
  if (reservations.length === 1) {
    // Single reservation
    if (type === 'departure' && date) {
      return `reservation_depart_${date}_${reservations[0].bookingReference}.pdf`;
    } else if (type === 'arrival' && date) {
      return `reservation_arrivee_${date}_${reservations[0].bookingReference}.pdf`;
    }
    return `reservation_${reservations[0].bookingReference}.pdf`;
  } else {
    // Multiple reservations
    if (type === 'departure' && date) {
      return `reservations_depart_${date}_${reservations.length}_voyageurs.pdf`;
    } else if (type === 'arrival' && date) {
      return `reservations_arrivee_${date}_${reservations.length}_voyageurs.pdf`;
    }
    return `reservations_${today}_${reservations.length}_voyageurs.pdf`;
  }
}

// Export single reservation to PDF
export async function exportReservationToPDF(
  reservation: Reservation, 
  filterType?: string, 
  filterDate?: string
): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 8;

    // Helper function to add a new page if needed
    const checkNewPage = (currentY: number, neededSpace: number = 40) => {
      if (currentY + neededSpace > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        return 25;
      }
      return currentY;
    };

    // Top decorative line
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1.5);
    doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
    
    // Title positioned lower (between the two lines)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('TRAVEL RESERVATION DETAILS', pageWidth / 2, yPosition + 8, { align: 'center' });
    yPosition += 20;
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Booking Reference: ${reservation.bookingReference}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
    
    // Add filter info if provided
    if (filterType && filterDate) {
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229);
      const filterText = filterType === 'departure' 
        ? `Filtré par : Départ le ${formatDate(filterDate)}`
        : `Filtré par : Arrivée le ${formatDate(filterDate)}`;
      doc.text(filterText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
    }
    
    // Bottom decorative line
    doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
    yPosition += 8;

    // Booking Information Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('BOOKING INFORMATION', margin, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    const bookingInfo = [
      { label: 'Booking Reference', value: reservation.bookingReference },
      { label: 'Booking Date', value: formatDate(reservation.bookingDate) },
      { label: 'Hotel', value: reservation.hotelName || 'N/A' },
      { label: 'Agency', value: `${reservation.agency || 'N/A'} (${reservation.agencyCode || 'N/A'})` },
    ];
    
    for (const info of bookingInfo) {
      yPosition = checkNewPage(yPosition);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(info.label + ':', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(info.value, margin + 45, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 5;

    // Passengers Section
    yPosition = checkNewPage(yPosition, 40 + (reservation.passengers.length * 20));
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`PASSENGERS (${reservation.passengers.length})`, margin, yPosition);
    yPosition += 8;
    
    for (let i = 0; i < reservation.passengers.length; i++) {
      const p = reservation.passengers[i];
      yPosition = checkNewPage(yPosition, 25);
      
      // Light background for passengers
      if (i % 2 === 0) {
        doc.setFillColor(245, 245, 250);
        doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 20, 'F');
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text(`${p.civility} ${p.firstName} ${p.lastName}`, margin + 3, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      if (p.age) {
        doc.text(`Age: ${p.age}`, margin + 8, yPosition);
        yPosition += 5;
      }
      if (p.dateOfBirth) {
        doc.text(`Born: ${formatDate(p.dateOfBirth)}`, margin + 8, yPosition);
        yPosition += 5;
      }
      yPosition += 6;
    }
    yPosition += 3;

    // Outbound Flight Section
    yPosition = checkNewPage(yPosition, 70);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('OUTBOUND FLIGHT', margin, yPosition);
    yPosition += 8;
    
    // Flight card background
    doc.setFillColor(250, 250, 255);
    doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55);
    
    const outboundInfo = [
      { label: 'From:', value: `${reservation.outboundFlight.departureCity || 'N/A'} (${reservation.outboundFlight.departureIATA || 'N/A'})` },
      { label: 'Departure:', value: `${formatDate(reservation.outboundFlight.departureDate)} at ${formatTime(reservation.outboundFlight.departureTime)}` },
      { label: 'To:', value: `${reservation.outboundFlight.arrivalCity || 'N/A'} (${reservation.outboundFlight.arrivalIATA || 'N/A'})` },
      { label: 'Arrival:', value: `${formatDate(reservation.outboundFlight.arrivalDate)} at ${formatTime(reservation.outboundFlight.arrivalTime)}` },
      { label: 'Flight Number:', value: reservation.outboundFlight.flightNumber || 'N/A' },
      { label: 'Airline:', value: reservation.outboundFlight.airline || 'N/A' },
    ];
    
    let outboundY = yPosition;
    for (const info of outboundInfo) {
      // Label and value on the same line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 120);
      doc.text(info.label, margin + 5, outboundY);
      
      // Value on the same line, just after the label
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(info.value, margin + 30, outboundY);
      
      outboundY += 8;
    }
    yPosition += 58;

    // Return Flight Section
    yPosition = checkNewPage(yPosition, 70);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('RETURN FLIGHT', margin, yPosition);
    yPosition += 8;
    
    // Flight card background
    doc.setFillColor(250, 250, 255);
    doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55);
    
    const returnInfo = [
      { label: 'From:', value: `${reservation.returnFlight.departureCity || 'N/A'} (${reservation.returnFlight.departureIATA || 'N/A'})` },
      { label: 'Departure:', value: `${formatDate(reservation.returnFlight.departureDate)} at ${formatTime(reservation.returnFlight.departureTime)}` },
      { label: 'To:', value: `${reservation.returnFlight.arrivalCity || 'N/A'} (${reservation.returnFlight.arrivalIATA || 'N/A'})` },
      { label: 'Arrival:', value: `${formatDate(reservation.returnFlight.arrivalDate)} at ${formatTime(reservation.returnFlight.arrivalTime)}` },
      { label: 'Flight Number:', value: reservation.returnFlight.flightNumber || 'N/A' },
      { label: 'Airline:', value: reservation.returnFlight.airline || 'N/A' },
    ];
    
    let returnY = yPosition;
    for (const info of returnInfo) {
      // Label and value on the same line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 120);
      doc.text(info.label, margin + 5, returnY);
      
      // Value on the same line, just after the label
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(info.value, margin + 30, returnY);
      
      returnY += 8;
    }

    // Footer
    const pageCount = doc.internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      doc.text('Travel Reservation Manager', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
    }

    // Save PDF with dynamic filename
    const filename = generateFilename([reservation], filterType, filterDate);
    doc.save(filename);
    
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}

// Export multiple reservations to a SINGLE PDF file
export async function exportMultipleReservationsToPDF(
  reservations: Reservation[], 
  filterType?: string, 
  filterDate?: string
): Promise<void> {
  if (reservations.length === 0) {
    throw new Error('No reservations to export');
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 8;
    let isFirstPage = true;

    // Helper function to add a new page if needed
    const checkNewPage = (currentY: number, neededSpace: number = 40) => {
      if (currentY + neededSpace > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        return 25;
      }
      return currentY;
    };

    for (let idx = 0; idx < reservations.length; idx++) {
      const reservation = reservations[idx];
      
      // Add page break between reservations (except before the first one)
      if (!isFirstPage) {
        doc.addPage();
        yPosition = 25;
      }
      isFirstPage = false;

      // Top decorative line
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1.5);
      doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
      
      // Title positioned lower (between the two lines)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229);
      doc.text('TRAVEL RESERVATION DETAILS', pageWidth / 2, yPosition + 8, { align: 'center' });
      yPosition += 20;
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Booking Reference: ${reservation.bookingReference}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;
      
      // Add filter info on first page only
      if (idx === 0 && filterType && filterDate) {
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        const filterText = filterType === 'departure' 
          ? `Filtré par : Départ le ${formatDate(filterDate)}`
          : `Filtré par : Arrivée le ${formatDate(filterDate)}`;
        doc.text(filterText, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }
      
      // Bottom decorative line
      doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
      yPosition += 8;

      // Booking Information Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text('BOOKING INFORMATION', margin, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      const bookingInfo = [
        { label: 'Booking Reference', value: reservation.bookingReference },
        { label: 'Booking Date', value: formatDate(reservation.bookingDate) },
        { label: 'Hotel', value: reservation.hotelName || 'N/A' },
        { label: 'Agency', value: `${reservation.agency || 'N/A'} (${reservation.agencyCode || 'N/A'})` },
      ];
      
      for (const info of bookingInfo) {
        yPosition = checkNewPage(yPosition);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(info.label + ':', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(info.value, margin + 45, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 5;

      // Passengers Section
      yPosition = checkNewPage(yPosition, 40 + (reservation.passengers.length * 20));
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text(`PASSENGERS (${reservation.passengers.length})`, margin, yPosition);
      yPosition += 8;
      
      for (let i = 0; i < reservation.passengers.length; i++) {
        const p = reservation.passengers[i];
        yPosition = checkNewPage(yPosition, 25);
        
        // Light background for passengers
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 250);
          doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 20, 'F');
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229);
        doc.text(`${p.civility} ${p.firstName} ${p.lastName}`, margin + 3, yPosition);
        yPosition += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        if (p.age) {
          doc.text(`Age: ${p.age}`, margin + 8, yPosition);
          yPosition += 5;
        }
        if (p.dateOfBirth) {
          doc.text(`Born: ${formatDate(p.dateOfBirth)}`, margin + 8, yPosition);
          yPosition += 5;
        }
        yPosition += 6;
      }
      yPosition += 3;

      // Outbound Flight Section
      yPosition = checkNewPage(yPosition, 70);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text('OUTBOUND FLIGHT', margin, yPosition);
      yPosition += 8;
      
      // Flight card background
      doc.setFillColor(250, 250, 255);
      doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55, 'F');
      doc.setDrawColor(200, 200, 220);
      doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55);
      
      const outboundInfo = [
        { label: 'From:', value: `${reservation.outboundFlight.departureCity || 'N/A'} (${reservation.outboundFlight.departureIATA || 'N/A'})` },
        { label: 'Departure:', value: `${formatDate(reservation.outboundFlight.departureDate)} at ${formatTime(reservation.outboundFlight.departureTime)}` },
        { label: 'To:', value: `${reservation.outboundFlight.arrivalCity || 'N/A'} (${reservation.outboundFlight.arrivalIATA || 'N/A'})` },
        { label: 'Arrival:', value: `${formatDate(reservation.outboundFlight.arrivalDate)} at ${formatTime(reservation.outboundFlight.arrivalTime)}` },
        { label: 'Flight Number:', value: reservation.outboundFlight.flightNumber || 'N/A' },
        { label: 'Airline:', value: reservation.outboundFlight.airline || 'N/A' },
      ];
      
      let outboundY = yPosition;
      for (const info of outboundInfo) {
        // Label and value on the same line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 120);
        doc.text(info.label, margin + 5, outboundY);
        
        // Value on the same line, just after the label
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(info.value, margin + 30, outboundY);
        
        outboundY += 8;
      }
      yPosition += 58;

      // Return Flight Section
      yPosition = checkNewPage(yPosition, 70);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text('RETURN FLIGHT', margin, yPosition);
      yPosition += 8;
      
      // Flight card background
      doc.setFillColor(250, 250, 255);
      doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55, 'F');
      doc.setDrawColor(200, 200, 220);
      doc.rect(margin, yPosition - 3, pageWidth - (margin * 2), 55);
      
      const returnInfo = [
        { label: 'From:', value: `${reservation.returnFlight.departureCity || 'N/A'} (${reservation.returnFlight.departureIATA || 'N/A'})` },
        { label: 'Departure:', value: `${formatDate(reservation.returnFlight.departureDate)} at ${formatTime(reservation.returnFlight.departureTime)}` },
        { label: 'To:', value: `${reservation.returnFlight.arrivalCity || 'N/A'} (${reservation.returnFlight.arrivalIATA || 'N/A'})` },
        { label: 'Arrival:', value: `${formatDate(reservation.returnFlight.arrivalDate)} at ${formatTime(reservation.returnFlight.arrivalTime)}` },
        { label: 'Flight Number:', value: reservation.returnFlight.flightNumber || 'N/A' },
        { label: 'Airline:', value: reservation.returnFlight.airline || 'N/A' },
      ];
      
      let returnY = yPosition;
      for (const info of returnInfo) {
        // Label and value on the same line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 120);
        doc.text(info.label, margin + 5, returnY);
        
        // Value on the same line, just after the label
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(info.value, margin + 30, returnY);
        
        returnY += 8;
      }
      yPosition += 65;
    }

    // Footer on all pages
    const pageCount = doc.internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      doc.text('Travel Reservation Manager', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
    }

    // Save PDF with dynamic filename
    const filename = generateFilename(reservations, filterType, filterDate);
    doc.save(filename);
    
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}