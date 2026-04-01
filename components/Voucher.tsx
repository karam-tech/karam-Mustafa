import React from 'react';
import { JournalEntry, Account } from '../types';
import { tafkeet } from '../utils/tafkeet.ts';
import { Printer, X } from 'lucide-react';

interface VoucherProps {
    entry: JournalEntry;
    accounts: Account[];
    type: 'receipt' | 'payment';
    onClose: () => void;
}

const Voucher: React.FC<VoucherProps> = ({ entry, accounts, type, onClose }) => {

    const isReceipt = type === 'receipt';
    
    // For simple payment/receipt, there's one debit and one credit.
    // Receipt: Debit=Cash/Bank, Credit=Customer
    // Payment: Debit=Expense/Supplier, Credit=Cash/Bank
    const debitLine = entry.lines.find(l => l.debit > 0);
    const creditLine = entry.lines.find(l => l.credit > 0);

    if (!debitLine || !creditLine) {
        return null; // Should not happen for valid simple entries
    }
    
    const amount = debitLine.debit;
    const amountInWords = tafkeet(amount);

    const partyAccount = accounts.find(a => a.id === (isReceipt ? creditLine.accountId : debitLine.accountId));
    const cashOrBankAccount = accounts.find(a => a.id === (isReceipt ? debitLine.accountId : creditLine.accountId));

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 print:p-0 print:bg-white font-sans">
            <div className="relative bg-primary p-4 rounded-lg shadow-xl w-full max-w-2xl print:bg-white print:p-0 print:shadow-none">
                <div className="printable-area bg-primary p-8 text-text-primary" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    {/* Header */}
                    <header className="text-center pb-4 mb-4 border-b-2 border-text-primary">
                        <h1 className="text-2xl font-extrabold">شركة إيجيبشن إكسبريس للشحن و التجارة</h1>
                        <h2 className="text-xl font-extrabold mt-4">{isReceipt ? 'إيصال قبض' : 'إيصال دفع'}</h2>
                    </header>
                    
                    {/* Info Section */}
                    <section className="flex justify-between mb-6 text-lg">
                        <p><strong>رقم:</strong> {entry.referenceNumber || entry.id.substring(0, 8)}</p>
                        <p><strong>التاريخ:</strong> {new Date(entry.date).toLocaleDateString('ar-EG-u-nu-latn')}</p>
                    </section>
                    
                    {/* Amount Box */}
                    <section className="text-center border-2 border-text-primary p-2 mb-6">
                        <span className="text-2xl font-extrabold font-mono">{new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount)}</span>
                    </section>
                    
                    {/* Details Section */}
                    <section className="space-y-4 text-lg leading-loose" dir="rtl">
                        <p>
                            <strong>{isReceipt ? 'استلمنا من السيد/السادة:' : 'صرف للسيد/السادة:'}</strong>
                            <span className="font-bold underline decoration-dotted ml-2">{partyAccount?.name.replace('العملاء - ', '') || 'غير محدد'}</span>
                        </p>
                         <p>
                            <strong>مبلغاً وقدره:</strong>
                            <span className="font-bold underline decoration-dotted ml-2">{amountInWords}</span>
                        </p>
                        <p>
                            <strong>وذلك عن:</strong>
                            <span className="font-bold underline decoration-dotted ml-2">{entry.description}</span>
                        </p>
                        <p>
                            <strong>{isReceipt ? 'تم إيداع المبلغ في حساب:' : 'تم صرف المبلغ من حساب:'}</strong>
                            <span className="font-bold underline decoration-dotted ml-2">{cashOrBankAccount?.name || 'غير محدد'}</span>
                        </p>
                    </section>
                    
                    {/* Signature Section */}
                    <footer className="flex justify-around mt-16 pt-8 text-lg font-extrabold">
                        <div>
                            <p>.................................</p>
                            <p className="text-center">{isReceipt ? 'المستلم' : 'المحاسب'}</p>
                        </div>
                         <div>
                            <p>.................................</p>
                            <p className="text-center">{isReceipt ? 'المحاسب' : 'المستلم'}</p>
                        </div>
                    </footer>
                </div>

                <div className="no-print absolute top-2 right-2 flex gap-2">
                    <button onClick={handlePrint} className="p-3 bg-accent text-white rounded-full shadow-lg hover:bg-accent-dark">
                        <Printer size={20} />
                    </button>
                    <button onClick={onClose} className="p-3 bg-primary-light text-text-primary rounded-full shadow-lg hover:shadow-neumo-sm">
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Voucher;