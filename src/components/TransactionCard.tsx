import { Edit3, Trash2 } from 'lucide-react';
import type { Transaction } from '../types';
import { monthDay } from '../utils/date';
import { itemsText } from '../utils/exportCsv';
import { signedMoney } from '../utils/money';
import { displayPhone } from '../utils/phone';
import { roleText } from '../constants/defaults';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const isIncome = transaction.type === 'income';
  return (
    <article className={`transaction-card ${isIncome ? 'is-income' : 'is-expense'}`}>
      <div className="transaction-card__main">
        <span className="transaction-card__date">{monthDay(transaction.date)}</span>
        <div>
          <strong>{isIncome ? transaction.customerName || '收入' : '支出'}</strong>
          <p>{itemsText(transaction)}</p>
          <small>
            {isIncome ? displayPhone(transaction.customerPhone) : transaction.expenseCategoryName} ·{' '}
            {transaction.paymentMethodName} · {roleText[transaction.createdBy ?? 'unknown']}
          </small>
        </div>
      </div>
      <div className="transaction-card__side">
        <strong>{isIncome ? signedMoney('income', transaction.totalAmount) : signedMoney('expense', transaction.totalAmount)}</strong>
        <div className="icon-actions">
          {onEdit ? (
            <button type="button" className="icon-button" onClick={() => onEdit(transaction)} aria-label="编辑流水" title="编辑">
              <Edit3 size={18} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="icon-button icon-button--danger"
              onClick={() => onDelete(transaction)}
              aria-label="删除流水"
              title="删除"
            >
              <Trash2 size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
