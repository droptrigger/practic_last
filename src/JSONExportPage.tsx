import React, { useEffect, useState } from 'react';
// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts as any).vfs;

interface JSONExportPageProps {
  date: string;
}

const GROUPS_IN_ROW = 7;
const CELL_WIDTH = 200;
const PAGE_WIDTH = 30 + GROUPS_IN_ROW * CELL_WIDTH; // 30 - ширина номера пары, 200 - запас для центрирования
const PAGE_HEIGHT = 1580; // увеличить высоту для пропорций

const JSONExportPage: React.FC<JSONExportPageProps> = ({ date }) => {
  const [json, setJson] = useState<string>('');
  const [parsed, setParsed] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('scheduleExportJSON');
    setJson(data || 'Нет данных для экспорта.');
    try {
      setParsed(data ? JSON.parse(data) : null);
    } catch {
      setParsed(null);
    }
  }, []);

  // Генерация PDF только для одной смены
  const generatePDFForShift = (shiftKey: '1 смена' | '2 смена') => {
    if (!parsed || !parsed.расписание) return;
    const shiftData = parsed.расписание[shiftKey] || [];
    const makeTable = (shiftData: any[], shiftName: string) => {
      const chunks = [];
      for (let i = 0; i < shiftData.length; i += GROUPS_IN_ROW) {
        chunks.push(shiftData.slice(i, i + GROUPS_IN_ROW));
      }
      return chunks.map((chunk, chunkIdx) => {
        const maxLessons = Math.max(...chunk.map(cell => cell.пары.length));
        const headerRow = [
          { text: 'Пара', bold: true, alignment: 'center' },
          ...chunk.map(cell => ({
            text: (cell.группы && cell.группы.length > 0) ? cell.группы.join(' / ') : '',
            bold: true,
            alignment: 'center'
          }))
        ];
        while (headerRow.length < GROUPS_IN_ROW + 1) {
          headerRow.push({ text: '', bold: true, alignment: 'center' });
        }
        const body = [headerRow];
        for (let lessonIdx = 0; lessonIdx < maxLessons; lessonIdx++) {
          const row = [
            { text: `${lessonIdx + 1}`, bold: true, alignment: 'center' }
          ];
          for (let groupIdx = 0; groupIdx < GROUPS_IN_ROW; groupIdx++) {
            const cell = chunk[groupIdx];
            if (!cell || !cell.пары[lessonIdx]) {
              row.push({ text: '', bold: false, alignment: 'left' });
              continue;
            }
            const pair = cell.пары[lessonIdx];
            let lines = [];
            const isNumericOrD = (str: string) => /^[0-9]+$/.test(str) || /^[дД]$/.test(str.trim());
            const cabinets = [pair["кабинет 1"], pair["кабинет 2"]].filter(Boolean);
            const numericRooms = cabinets.filter(isNumericOrD);
            const textRooms = cabinets.filter(r => !isNumericOrD(r));
            let leftStr = pair.предмет || '';
            if (textRooms.length) leftStr += (leftStr ? ', ' : '') + textRooms.join(', ');
            let rightStr = numericRooms.join(' / ');
            if (pair["время"]) {
              lines.push({ text: pair["время"], alignment: 'left', style: { margin: [0, 0, 0, 8] } });
            }
            if (pair.предмет || cabinets.length) {
              lines.push({
                columns: [
                  { text: leftStr, width: '80%', alignment: 'left' },
                  { text: rightStr, width: '20%', alignment: 'right' }
                ],
                style: { margin: [0, 0, 0, 16] }
              });
            }
            let teacherStr = pair["преподаватель 1"] || '';
            if (pair["преподаватель 2"]) {
              teacherStr = teacherStr ? teacherStr + ' / ' + pair["преподаватель 2"] : pair["преподаватель 2"];
            }
            if (teacherStr) lines.push({ text: teacherStr, alignment: 'left', style: { margin: [0, 0, 0, 8] } });
            if (pair.предмет || leftStr || rightStr || teacherStr || pair["время"]) {
              row.push({ stack: lines } as any);
            } else {
              row.push({ text: '', bold: false, alignment: 'left' });
            }
          }
          body.push(row);
        }
        return {
          table: {
            headerRows: 0,
            widths: [30, ...Array(GROUPS_IN_ROW).fill(CELL_WIDTH)],
            body
          },
          margin: [0, 0, 0, 0],
          layout: {
            hLineWidth: function () { return 1; },
            vLineWidth: function () { return 1; },
            hLineColor: function () { return '#000'; },
            vLineColor: function () { return '#000'; },
            paddingLeft: function () { return 4; },
            paddingRight: function () { return 4; },
            paddingTop: function () { return 8; },
            paddingBottom: function () { return 8; },
            heights: function(row: any) { return 50; }
          },
          alignment: 'center',
        };
      });
    };
    const docDefinition = {
      pageOrientation: 'landscape',
      pageSize: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      content: [
        {
          text: [
            { text: 'РАСПИСАНИЕ', style: 'mainHeader' },
            { text: '\n' },
            { text: `учебных занятий на ${parseInt((parsed.дата || date).split('-')[2], 10)} ${['ЯНВАРЯ','ФЕВРАЛЯ','МАРТА','АПРЕЛЯ','МАЯ','ИЮНЯ','ИЮЛЯ','АВГУСТА','СЕНТЯБРЯ','ОКТЯБРЯ','НОЯБРЯ','ДЕКАБРЯ'][parseInt((parsed.дата || date).split('-')[1], 10)-1]} ${(parsed.дата || date).split('-')[0]}`, style: 'subHeader' }
          ],
          alignment: 'center'
        },
        { text: shiftKey === '1 смена' ? '1 СМЕНА' : '2 СМЕНА', style: 'subheader', alignment: 'center' },
        ...makeTable(shiftData, shiftKey)
      ],
      styles: {
        mainHeader: {
          fontSize: 28,
          bold: true,
          margin: [0, 0, 0, 8],
          alignment: 'center'
        },
        subHeader: {
          fontSize: 16,
          margin: [0, 0, 0, 15],
          alignment: 'center'
        },
        subheader: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
          alignment: 'center'
        }
      }
    };
    pdfMake.createPdf(docDefinition).download(`schedule_json_${shiftKey.replace(' ', '_')}_${parsed.дата || date}.pdf`);
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>JSON Экспорт</h2>
      <p>Дата: {date}</p>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ textAlign: 'center' }}>1 смена</h3>
          <button
            style={{ marginBottom: 16, background: '#43a047', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}
            onClick={() => generatePDFForShift('1 смена')}
            disabled={!parsed || !parsed.расписание || !parsed.расписание['1 смена']}
          >
            PDF по JSON (1 смена)
          </button>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, maxWidth: 600, overflowX: 'auto', minHeight: 300 }}>
            {parsed && parsed.расписание && parsed.расписание['1 смена']
              ? JSON.stringify(parsed.расписание['1 смена'], null, 2)
              : 'Нет данных'}
          </pre>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ textAlign: 'center' }}>2 смена</h3>
          <button
            style={{ marginBottom: 16, background: '#43a047', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}
            onClick={() => generatePDFForShift('2 смена')}
            disabled={!parsed || !parsed.расписание || !parsed.расписание['2 смена']}
          >
            PDF по JSON (2 смена)
          </button>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, maxWidth: 600, overflowX: 'auto', minHeight: 300 }}>
            {parsed && parsed.расписание && parsed.расписание['2 смена']
              ? JSON.stringify(parsed.расписание['2 смена'], null, 2)
              : 'Нет данных'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default JSONExportPage; 