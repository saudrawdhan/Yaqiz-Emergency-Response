import jsPDF from 'jspdf'
import { Incident } from '../types/incident'

export const generateIncidentReport = (incident: Incident): void => {
  const doc = new jsPDF()
  
  // Set fonts and colors
  const primaryColor = [157, 238, 43] // Lime green
  
  let yPosition = 20
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, pageWidth, 30, 'F')
  
  doc.setTextColor(10, 14, 20)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('EMERGENCY RESPONSE SYSTEM', margin, 15)
  doc.setFontSize(12)
  doc.text('Incident Report', margin, 23)
  
  yPosition = 45

  // Case ID and Status
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Case ID: ${incident.caseId}`, margin, yPosition)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 60, yPosition)
  
  yPosition += 15

  // Incident Summary Box
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setLineWidth(0.5)
  doc.rect(margin, yPosition, contentWidth, 40)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('INCIDENT SUMMARY', margin + 5, yPosition + 8)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  
  const summaryLines = doc.splitTextToSize(incident.aiSummary, contentWidth - 10)
  doc.text(summaryLines, margin + 5, yPosition + 16)
  
  yPosition += 50

  // Details Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('INCIDENT DETAILS', margin, yPosition)
  yPosition += 10

  const details = [
    { label: 'Location:', value: incident.location },
    { label: 'Time of Incident:', value: new Date(incident.time).toLocaleString() },
    { label: 'Severity:', value: incident.severity.toUpperCase() },
    { label: 'Status:', value: incident.status.toUpperCase().replace(/_/g, ' ') },
    { label: 'Estimated Injuries:', value: incident.estimatedInjuries?.toString() || 'Unknown' },
    { label: 'Confidence Level:', value: incident.confidence.toUpperCase() },
  ]

  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  
  details.forEach(detail => {
    doc.setFont('helvetica', 'bold')
    doc.text(detail.label, margin, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.text(detail.value, margin + 50, yPosition)
    yPosition += 7
  })

  yPosition += 10

  // Environmental Conditions
  if (incident.weather || incident.traffic) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('ENVIRONMENTAL CONDITIONS', margin, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    
    if (incident.weather) {
      doc.setFont('helvetica', 'bold')
      doc.text('Weather:', margin, yPosition)
      doc.setFont('helvetica', 'normal')
      doc.text(`${incident.weather.condition}, ${incident.weather.temperature}°C, Visibility: ${incident.weather.visibility}`, margin + 25, yPosition)
      yPosition += 7
    }

    if (incident.traffic) {
      doc.setFont('helvetica', 'bold')
      doc.text('Traffic:', margin, yPosition)
      doc.setFont('helvetica', 'normal')
      doc.text(incident.traffic, margin + 25, yPosition)
      yPosition += 7
    }

    yPosition += 10
  }

  // Dispatched Units
  if (incident.dispatchedUnits.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('DISPATCHED UNITS', margin, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    
    incident.dispatchedUnits.forEach(unit => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${unit.name} (${unit.agency})`, margin, yPosition)
      doc.setFont('helvetica', 'normal')
      doc.text(`Status: ${unit.status.toUpperCase().replace(/_/g, ' ')}`, margin + 5, yPosition + 5)
      doc.text(`Dispatched: ${new Date(unit.dispatchedAt).toLocaleTimeString()}`, margin + 5, yPosition + 10)
      if (unit.onSceneAt) {
        doc.text(`On Scene: ${new Date(unit.onSceneAt).toLocaleTimeString()}`, margin + 5, yPosition + 15)
        yPosition += 5
      }
      yPosition += 20
    })
  }

  // New page for Action Log
  doc.addPage()
  yPosition = 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('MULTI-AGENCY RESPONSE LOG', margin, yPosition)
  yPosition += 10

  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  
  incident.actionLog.forEach((log) => {
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.text(new Date(log.timestamp).toLocaleString(), margin, yPosition)
    doc.setFont('helvetica', 'normal')
    const actionLines = doc.splitTextToSize(log.action, contentWidth - 50)
    doc.text(actionLines, margin + 50, yPosition)
    yPosition += (actionLines.length * 5) + 5
  })

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' })
    doc.text(`Emergency Response System - Confidential`, margin, doc.internal.pageSize.height - 10)
  }

  // Save the PDF
  doc.save(`Incident_Report_${incident.caseId}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export const generateSystemReport = (type: 'audit' | 'performance', _data: any): void => {
  const doc = new jsPDF()
  const primaryColor = [157, 238, 43]
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, pageWidth, 30, 'F')
  
  doc.setTextColor(10, 14, 20)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('EMERGENCY RESPONSE SYSTEM', margin, 15)
  doc.setFontSize(12)
  doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, margin, 23)

  let yPosition = 50

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition)
  
  yPosition += 15

  doc.setFontSize(12)
  doc.setTextColor(50, 50, 50)
  doc.text('This is a placeholder system report.', margin, yPosition)
  doc.text('Full implementation would include detailed system metrics and analytics.', margin, yPosition + 10)

  doc.save(`${type}_report_${new Date().toISOString().split('T')[0]}.pdf`)
}
