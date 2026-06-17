import type { Customer, Role, Transaction } from '../types';

type ExcelValue = string | number | boolean | null | undefined;

interface WorkbookSheet {
  name: string;
  rows: ExcelValue[][];
}

export interface IncomeExcelRow {
  date: string;
  customerName: string;
  customerPhone?: string;
  categoryName: string;
  itemName?: string;
  amount: number;
  paymentMethodName: string;
  note?: string;
  createdBy?: Role;
}

export interface CustomerExcelRow {
  name: string;
  phone?: string;
  note?: string;
}

export interface FengeWorkbookRows {
  incomes: IncomeExcelRow[];
  customers: CustomerExcelRow[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

const INCOME_HEADERS = ['日期', '顾客姓名', '手机号', '一级项目', '子项目', '金额', '支付方式', '备注', '记账人'];
const CUSTOMER_HEADERS = ['姓名', '手机号', '备注'];

export function makeFengeWorkbook(transactions: Transaction[], customers: Customer[]): Blob {
  const incomeRows = transactions
    .filter((transaction) => !transaction.deletedAt && transaction.type === 'income')
    .flatMap((transaction) => {
      const items = transaction.items?.length
        ? transaction.items
        : [
            {
              categoryName: '',
              itemName: '',
              amount: transaction.totalAmount
            }
          ];

      return items.map((item) => [
        transaction.date,
        transaction.customerName ?? '',
        transaction.customerPhone ?? '',
        item.categoryName,
        item.itemName ?? '',
        item.amount,
        transaction.paymentMethodName,
        transaction.note ?? '',
        transaction.createdBy ?? ''
      ]);
    });

  const customerRows = customers
    .filter((customer) => !customer.deletedAt)
    .map((customer) => [customer.name, customer.phone ?? '', customer.note ?? '']);

  return makeWorkbook([
    { name: '收入流水', rows: [INCOME_HEADERS, ...incomeRows] },
    { name: '顾客', rows: [CUSTOMER_HEADERS, ...customerRows] },
    {
      name: '导入说明',
      rows: [
        ['导入规则'],
        ['收入流水：每一行会追加为一笔新的收入流水，不会覆盖或删除已有数据。'],
        ['顾客：手机号必填，并按 11 位手机号识别；找不到时会新增顾客。'],
        ['金额必须大于 0；日期建议填写为 2026-06-17 这样的格式。']
      ]
    }
  ]);
}

export async function parseFengeWorkbook(file: File): Promise<FengeWorkbookRows> {
  const sheets = await readWorkbookSheets(new Uint8Array(await file.arrayBuffer()));
  return {
    incomes: parseIncomeRows(sheets['收入流水'] ?? sheets['流水'] ?? []),
    customers: parseCustomerRows(sheets['顾客'] ?? sheets['客户'] ?? [])
  };
}

function makeWorkbook(sheets: WorkbookSheet[]): Blob {
  const entries: Array<{ path: string; content: string }> = [
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('\n  ')}
</Types>`
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      path: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXmlAttr(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('\n    ')}
  </sheets>
</workbook>`
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join('\n  ')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      path: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`
    },
    ...sheets.map((sheet, index) => ({ path: `xl/worksheets/sheet${index + 1}.xml`, content: sheetToXml(sheet.rows) }))
  ];

  return zipEntries(entries.map((entry) => ({ path: entry.path, bytes: encoder.encode(entry.content) })));
}

function sheetToXml(rows: ExcelValue[][]): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row.map((value, columnIndex) => cellToXml(value, columnName(columnIndex + 1), rowIndex + 1)).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function cellToXml(value: ExcelValue, column: string, row: number): string {
  const ref = `${column}${row}`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = sanitizeXml(String(value ?? ''));
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`;
}

function zipEntries(entries: Array<{ path: string; bytes: Uint8Array }>): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = encoder.encode(entry.path);
    const crc = crc32(entry.bytes);
    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(entry.bytes.length),
      uint32(entry.bytes.length),
      uint16(name.length),
      uint16(0),
      name
    ]);
    localParts.push(localHeader, entry.bytes);

    const centralHeader = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(entry.bytes.length),
      uint32(entry.bytes.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.bytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0)
  ]);

  return new Blob([...localParts, centralDirectory, end].map(bytesToBlobPart), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

async function readWorkbookSheets(bytes: Uint8Array): Promise<Record<string, string[][]>> {
  const entries = await unzipEntries(bytes);
  const workbook = parseXml(entries['xl/workbook.xml'] ?? '');
  const rels = parseXml(entries['xl/_rels/workbook.xml.rels'] ?? '');
  const relationTargets = new Map<string, string>();

  elementsByLocalName(rels, 'Relationship').forEach((relationship) => {
    const id = relationship.getAttribute('Id');
    const target = relationship.getAttribute('Target');
    if (id && target) relationTargets.set(id, normalizeWorkbookTarget(target));
  });

  const sharedStrings = entries['xl/sharedStrings.xml'] ? readSharedStrings(entries['xl/sharedStrings.xml']) : [];
  const result: Record<string, string[][]> = {};

  elementsByLocalName(workbook, 'sheet').forEach((sheet) => {
    const name = sheet.getAttribute('name');
    const relId = sheet.getAttribute('r:id');
    const target = relId ? relationTargets.get(relId) : null;
    if (!name || !target || !entries[target]) return;
    result[name] = readSheetRows(entries[target], sharedStrings);
  });

  return result;
}

async function unzipEntries(bytes: Uint8Array): Promise<Record<string, string>> {
  const endOffset = findEndOfCentralDirectory(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const result: Record<string, string> = {};
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Excel 文件目录格式不正确');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const content = method === 0 ? compressed : await inflateZipEntry(method, compressed);
    result[name] = decoder.decode(content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return result;
}

async function inflateZipEntry(method: number, compressed: Uint8Array): Promise<Uint8Array> {
  if (method !== 8) throw new Error('暂不支持这个 Excel 压缩格式，请另存为 .xlsx 后重试');
  if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持解析压缩 Excel，请使用新版 Chrome 或 Edge');
  const stream = new Blob([bytesToBlobPart(compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readSharedStrings(xml: string): string[] {
  const doc = parseXml(xml);
  return elementsByLocalName(doc, 'si').map((item) => textContentFromRuns(item));
}

function readSheetRows(xml: string, sharedStrings: string[]): string[][] {
  const doc = parseXml(xml);
  return elementsByLocalName(doc, 'row')
    .map((row) => {
      const cells: string[] = [];
      elementsByLocalName(row, 'c').forEach((cell, fallbackIndex) => {
        const columnIndex = columnIndexFromCellRef(cell.getAttribute('r'), fallbackIndex);
        cells[columnIndex] = readCellValue(cell, sharedStrings);
      });
      return trimEmptyTail(cells);
    })
    .filter((row) => row.some((cell) => cell.trim()));
}

function readCellValue(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') return textContentFromRuns(cell);
  const value = firstElementByLocalName(cell, 'v')?.textContent ?? '';
  if (type === 's') return sharedStrings[Number(value)] ?? '';
  if (type === 'b') return value === '1' ? 'TRUE' : 'FALSE';
  return value;
}

function parseIncomeRows(rows: string[][]): IncomeExcelRow[] {
  const table = rowsToObjects(rows);
  return table
    .map((row) => ({
      date: normalizeDate(pickCell(row, ['日期', 'date'])),
      customerName: pickCell(row, ['顾客姓名', '姓名', 'customerName']),
      customerPhone: pickCell(row, ['手机号', '电话', 'customerPhone']),
      categoryName: pickCell(row, ['一级项目', '项目', 'categoryName']),
      itemName: pickCell(row, ['子项目', '服务项目', 'itemName']),
      amount: parseAmount(pickCell(row, ['金额', '收入', 'amount', 'totalAmount'])),
      paymentMethodName: pickCell(row, ['支付方式', 'paymentMethodName']),
      note: pickCell(row, ['备注', 'note']),
      createdBy: parseRole(pickCell(row, ['记账人', 'createdBy']))
    }))
    .filter((row) => row.customerName || row.amount > 0 || row.categoryName);
}

function parseCustomerRows(rows: string[][]): CustomerExcelRow[] {
  return rowsToObjects(rows)
    .map((row) => ({
      name: pickCell(row, ['姓名', '顾客姓名', 'name', 'customerName']),
      phone: pickCell(row, ['手机号', '电话', 'phone', 'customerPhone']),
      note: pickCell(row, ['备注', 'note'])
    }))
    .filter((row) => row.name);
}

function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim()));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map(normalizeHeader);
  return rows.slice(headerIndex + 1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index]?.trim() ?? '';
    });
    return record;
  });
}

function pickCell(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases.map(normalizeHeader)) {
    if (row[alias]) return row[alias];
  }
  return '';
}

function parseAmount(value: string): number {
  const amount = Number(value.replace(/[,\s¥￥]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeDate(value: string): string {
  const text = value.trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  return text;
}

function parseRole(value: string): Role | undefined {
  if (value === 'mom' || value === 'dad' || value === 'unknown') return value;
  if (value.includes('妈')) return 'mom';
  if (value.includes('爸')) return 'dad';
  return undefined;
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Excel XML 解析失败');
  return doc;
}

function elementsByLocalName(parent: ParentNode, name: string): Element[] {
  return Array.from(parent.querySelectorAll('*')).filter((element) => element.localName === name);
}

function firstElementByLocalName(parent: ParentNode, name: string): Element | undefined {
  return elementsByLocalName(parent, name)[0];
}

function textContentFromRuns(parent: Element): string {
  return elementsByLocalName(parent, 't')
    .map((element) => element.textContent ?? '')
    .join('');
}

function normalizeWorkbookTarget(target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  return `xl/${target}`.replace(/\/[^/]+\/\.\.\//g, '/');
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) return index;
  }
  throw new Error('这不是有效的 .xlsx 文件');
}

function columnIndexFromCellRef(ref: string | null, fallbackIndex: number): number {
  const letters = ref?.match(/^[A-Z]+/i)?.[0];
  if (!letters) return fallbackIndex;
  return letters
    .toUpperCase()
    .split('')
    .reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function columnName(index: number): string {
  let name = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function trimEmptyTail(row: string[]): string[] {
  const next = [...row];
  while (next.length && !next[next.length - 1]?.trim()) next.pop();
  return next;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttr(value: string): string {
  return escapeXml(value).replace(/"/g, '&quot;');
}

function sanitizeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function bytesToBlobPart(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
