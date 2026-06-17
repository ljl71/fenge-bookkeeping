import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/PageHeader';
import { findOrCreateCustomer } from '../services/customerService';
import { createTransaction } from '../services/transactionService';
import type { TransactionItem } from '../types';
import { makeFengeWorkbook, parseFengeWorkbook, type IncomeExcelRow } from '../utils/excel';
import { customersToCsv, downloadBlob, downloadText, transactionsToCsv } from '../utils/exportCsv';
import { normalizePhone } from '../utils/phone';

export function Backup() {
  const { data, session, navigate, refreshData, setToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const liveTransactions = data.transactions.filter((row) => !row.deletedAt && row.type === 'income');
  const liveCustomers = data.customers.filter((row) => !row.deletedAt);
  const config = {
    serviceCategories: data.serviceCategories,
    serviceItems: data.serviceItems,
    paymentMethods: data.paymentMethods
  };
  const allData = {
    storeId: session.storeId,
    exportedAt: new Date().toISOString(),
    ...data
  };

  function exportExcel() {
    downloadBlob('fenge-income-customers.xlsx', makeFengeWorkbook(liveTransactions, liveCustomers));
    setToast({ kind: 'success', message: '已导出 Excel' });
  }

  function exportTransactionsCsv() {
    downloadText('fenge-income-transactions.csv', transactionsToCsv(liveTransactions), 'text/csv;charset=utf-8');
    setToast({ kind: 'success', message: '已导出收入流水 CSV' });
  }

  function exportCustomersCsv() {
    downloadText('fenge-customers.csv', customersToCsv(liveCustomers), 'text/csv;charset=utf-8');
    setToast({ kind: 'success', message: '已导出顾客 CSV' });
  }

  function exportAllDataJson() {
    downloadText('fenge-all-data.json', JSON.stringify(allData, null, 2), 'application/json;charset=utf-8');
    setToast({ kind: 'success', message: '已导出全部数据 JSON' });
  }

  function exportConfigJson() {
    downloadText('fenge-config.json', JSON.stringify(config, null, 2), 'application/json;charset=utf-8');
    setToast({ kind: 'success', message: '已导出项目配置 JSON' });
  }

  async function importExcel(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || importing) return;

    setImporting(true);
    try {
      const workbook = await parseFengeWorkbook(file);
      let customerCount = 0;
      let incomeCount = 0;

      for (const [index, customer] of workbook.customers.entries()) {
        validateCustomerRow(customer, index + 2);
        await findOrCreateCustomer(session.storeId, {
          name: customer.name,
          phone: customer.phone,
          note: customer.note
        });
        customerCount += 1;
      }

      for (const [index, row] of workbook.incomes.entries()) {
        validateIncomeRow(row, index + 2);
        const customer = await findOrCreateCustomer(session.storeId, {
          name: row.customerName,
          phone: row.customerPhone
        });
        const payment = findPaymentMethod(row.paymentMethodName);
        const item = makeTransactionItem(row);

        await createTransaction({
          storeId: session.storeId,
          type: 'income',
          customerId: customer._id,
          customerName: customer.name,
          customerPhone: customer.phone,
          items: [item],
          totalAmount: row.amount,
          paymentMethodId: payment.id,
          paymentMethodName: payment.name,
          date: row.date,
          note: row.note ?? '',
          createdBy: row.createdBy ?? session.role,
          deletedAt: null
        });
        incomeCount += 1;
      }

      if (!customerCount && !incomeCount) throw new Error('Excel 中没有可导入的顾客或收入流水');
      await refreshData();
      setToast({ kind: 'success', message: `已处理 ${incomeCount} 笔收入、${customerCount} 位顾客` });
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Excel 导入失败' });
    } finally {
      input.value = '';
      setImporting(false);
    }
  }

  function findPaymentMethod(name: string) {
    const paymentName = name.trim();
    const found = data.paymentMethods.find((method) => !method.deletedAt && method.name === paymentName);
    const fallback = data.paymentMethods.find((method) => !method.deletedAt && method.active) ?? data.paymentMethods.find((method) => !method.deletedAt);
    if (found) return { id: found._id, name: found.name };
    if (paymentName) return { id: fallback?._id, name: paymentName };
    if (fallback) return { id: fallback._id, name: fallback.name };
    throw new Error('请先在项目管理中配置至少一种支付方式');
  }

  function makeTransactionItem(row: IncomeExcelRow): TransactionItem {
    const categoryName = row.categoryName.trim();
    const itemName = row.itemName?.trim() ?? '';
    const category = data.serviceCategories.find((item) => !item.deletedAt && item.name === categoryName);
    if (!category?._id) throw new Error(`一级项目「${categoryName}」不存在，请先在项目管理中新增后再导入`);
    const serviceItem = itemName
      ? data.serviceItems.find(
          (item) =>
            !item.deletedAt &&
            item.name === itemName &&
            (!category || item.categoryId === category._id || item.categoryName === category.name)
        )
      : undefined;

    return {
      categoryId: category._id,
      categoryName: category.name,
      itemId: serviceItem?._id,
      itemName: serviceItem?.name ?? itemName,
      amount: row.amount
    };
  }

  return (
    <div className="page">
      <PageHeader
        title="备份导入导出"
        subtitle="建议每月导出一次 CSV、JSON 或 Excel。"
        action={
          <button type="button" className="button button--ghost" onClick={() => navigate('settings')}>
            <ArrowLeft size={18} />
            返回
          </button>
        }
      />
      <div className="notice">导出是下载当前云端已读取的数据。Excel 导入按 11 位手机号识别顾客，只追加顾客和收入流水，不覆盖或删除已有数据。</div>
      <section className="settings-list">
        <button type="button" onClick={exportExcel}>
          <FileSpreadsheet size={22} />
          <span>导出收入与顾客 Excel</span>
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          <Upload size={22} />
          <span>{importing ? '正在导入 Excel...' : '从 Excel 批量导入'}</span>
        </button>
        <input ref={fileInputRef} className="file-input-hidden" type="file" accept=".xlsx" onChange={importExcel} />
        <button type="button" onClick={exportTransactionsCsv}>
          <Download size={22} />
          <span>导出收入流水 CSV</span>
        </button>
        <button type="button" onClick={exportCustomersCsv}>
          <Download size={22} />
          <span>导出顾客 CSV</span>
        </button>
        <button type="button" onClick={exportAllDataJson}>
          <Download size={22} />
          <span>导出全部数据 JSON</span>
        </button>
        <button type="button" onClick={exportConfigJson}>
          <Download size={22} />
          <span>导出项目配置 JSON</span>
        </button>
      </section>
    </div>
  );
}

function validateIncomeRow(row: IncomeExcelRow, rowNumber: number) {
  if (!row.date) throw new Error(`收入流水第 ${rowNumber} 行缺少日期`);
  if (!row.customerName.trim()) throw new Error(`收入流水第 ${rowNumber} 行缺少顾客姓名`);
  if (!row.customerPhone?.trim()) throw new Error(`收入流水第 ${rowNumber} 行缺少手机号`);
  if (normalizePhone(row.customerPhone).length !== 11) throw new Error(`收入流水第 ${rowNumber} 行手机号需为 11 位`);
  if (!row.categoryName.trim()) throw new Error(`收入流水第 ${rowNumber} 行缺少一级项目`);
  if (!row.amount || row.amount <= 0) throw new Error(`收入流水第 ${rowNumber} 行金额必须大于 0`);
}

function validateCustomerRow(row: { name: string; phone?: string }, rowNumber: number) {
  if (!row.name.trim()) throw new Error(`顾客第 ${rowNumber} 行缺少姓名`);
  if (!row.phone?.trim()) throw new Error(`顾客第 ${rowNumber} 行缺少手机号`);
  if (normalizePhone(row.phone).length !== 11) throw new Error(`顾客第 ${rowNumber} 行手机号需为 11 位`);
}
