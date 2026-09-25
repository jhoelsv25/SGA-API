---
name: excel-pdf-reports
description: Patrones y recetas para exportar reportes en hojas de cálculo con exceljs y documentos PDF con pdfkit en NestJS.
---

# Generación de Reportes Excel y PDF en NestJS

Esta guía contiene recetas para generar reportes dinámicos utilizando `exceljs` y `pdfkit` retornando streams de descarga al cliente HTTP.

## 1. Exportación a Excel con `exceljs`

```typescript
import { Injectable, Res } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelReportService {
  async generateUserReport(users: any[], @Res() res: Response) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SGA Sistema';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Reporte de Usuarios');

    // Definición de columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Rol', key: 'role', width: 15 },
      { header: 'Fecha de Registro', key: 'createdAt', width: 20 },
    ];

    // Estilo de encabezados
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }, // Dark slate
    };

    // Agregar filas
    users.forEach((user) => worksheet.addRow(user));

    // Headers de respuesta HTTP
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-usuarios.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
```

## 2. Generación de PDF con `pdfkit`

```typescript
import { Injectable, Res } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfReportService {
  generateSimplePdf(title: string, content: string, @Res() res: Response) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=reporte.pdf`);

    doc.pipe(res);

    // Título
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown(1.5);

    // Cuerpo
    doc.fontSize(12).text(content, {
      align: 'justify',
      lineGap: 4,
    });

    // Pie de página con numeración
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Página ${i + 1} de ${range.count}`,
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 },
      );
    }

    doc.end();
  }
}
```
