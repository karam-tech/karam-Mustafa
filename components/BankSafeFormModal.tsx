
import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { X } from 'lucide-react';
import { validateEmail, validatePhone } from '../utils/validation.ts';

interface BankSafeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Account | Omit<Account, 'id'>) => void;
  initialData?: Account | null;
  defaults?: { category: 'bank' | 'safe', currencyType: 'local' | 'foreign' };
  accounts: Account[];
  requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

const BLANK_FORM_DATA: Omit<Account, 'id' | 'type' | 'isBankOrCash'> = {
    name: '', openingBalance: 0, category: 'bank', currencyType: 'local', phone: '', email: '',
    country: '', accountNumber: '', currency: 'EGP', conversionRate: 1, notes: '',
    linkedAccountId: undefined,
    minBalance: 0,
};

type FormErrors = Partial<Record<keyof Account, string>>;

const BankSafeFormModal: React.FC<BankSafeFormModalProps> = ({ isOpen, onClose, onSubmit, initialData, defaults, accounts, requestConfirmation }) => {
    const [formData, setFormData] = useState<Omit<Account, 'id' | 'type' | 'isBankOrCash'>>(BLANK_FORM_DATA);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isFormDirty, setIsFormDirty] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setIsFormDirty(false);
            if (initialData) {
                setFormData({ ...BLANK_FORM_DATA, ...initialData });
            } else {
                setFormData({ ...BLANK_FORM_DATA, ...defaults });
            }
        }
    }, [initialData, defaults, isOpen]);

    // Confirm before closing if form is dirty
    const handleClose = () => {
        if (isFormDirty) {
            requestConfirmation({
                title: 'تغييرات غير محفوظة',
                message: 'لديك تغييرات غير محفوظة. هل أنت متأكد من الإغلاق؟',
                onConfirm: () => {
                    onClose();
                    setIsFormDirty(false);
                },
                variant: 'danger'
            });
        } else {
            onClose();
        }
    };

    // Cleanup on unmount to ensure no stuck state
    useEffect(() => {
        return () => setIsFormDirty(false);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setIsFormDirty(true);
        
        let newFormData = { ...formData, [name]: type === 'number' ? parseFloat(value) || 0 : value };

        if (name === 'currencyType') {
            if (value === 'local') {
                newFormData = { ...newFormData, currency: 'EGP', conversionRate: 1 };
            } else {
                 newFormData = { ...newFormData, currency: '', conversionRate: 0 };
            }
        }

        setFormData(newFormData);
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = "الاسم مطلوب.";
        if (formData.email) newErrors.email = validateEmail(formData.email) || undefined;
        if (formData.phone) newErrors.phone = validatePhone(formData.phone) || undefined;
        if (formData.currencyType === 'foreign' && (!formData.currency || formData.currency.length < 3)) {
            newErrors.currency = "رمز العملة يجب أن يتكون من 3 أحرف على الأقل.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).filter(k => newErrors[k as keyof FormErrors]).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(initialData ? { ...initialData, ...formData } : { ...formData, type: 'Asset', isBankOrCash: true });
            setIsFormDirty(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    const isBank = formData.category === 'bank';
    const isForeign = formData.currencyType === 'foreign';
    const title = `${initialData ? 'تعديل' : 'إضافة'} ${isBank ? 'بنك' : 'صندوق'} ${isForeign ? 'أجنبي' : 'محلي'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={handleClose}>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                     {!initialData && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="font-bold text-text-secondary mb-2 block">النوع</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none">
                                    <option value="bank">بنك</option> <option value="safe">صندوق</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-text-secondary mb-2 block">العملة</label>
                                <select name="currencyType" value={formData.currencyType} onChange={handleChange} className="w-full p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none">
                                    <option value="local">محلية (EGP)</option> <option value="foreign">أجنبية</option>
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="font-bold text-text-secondary">الاسم</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.name ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="font-bold text-text-secondary">رصيد أول المدة</label>
                            <input type="number" step="0.01" name="openingBalance" value={formData.openingBalance || 0} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                         {isForeign && (
                            <>
                                <div>
                                    <label className="font-bold text-text-secondary">رمز العملة (eg. USD)</label>
                                    <input type="text" name="currency" value={formData.currency || ''} onChange={handleChange} placeholder="USD" className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.currency ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                                     {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency}</p>}
                                </div>
                                {(isForeign) && (
                                <div>
                                    <label className="font-bold text-text-secondary">معامل التحويل (لـ EGP)</label>
                                    <input type="number" step="0.01" name="conversionRate" value={formData.conversionRate || 0} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                                </div>
                                )}
                            </>
                        )}
                        <div>
                            <label className="font-bold text-text-secondary">الحد الأدنى للرصيد</label>
                            <input type="number" name="minBalance" value={formData.minBalance || 0} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                            <p className="text-xs text-text-secondary mt-1">اتركه 0 لاستخدام الحد العام للنظام</p>
                        </div>
                    </div>
                    <div>
                        <label className="font-bold text-text-secondary">ملاحظات</label>
                        <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={2} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                    </div>
                    
                    <div className="pt-4 border-t border-primary-dark/20">
                        <label className="font-bold text-text-secondary">ربط بحساب آخر (اختياري)</label>
                        <select
                            name="linkedAccountId"
                            value={formData.linkedAccountId || ''}
                            onChange={handleChange}
                            className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="">-- بدون ربط --</option>
                            {accounts
                                .filter(acc => acc.id !== initialData?.id) // Don't allow linking to self
                                .map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                                ))
                            }
                        </select>
                    </div>

                    {isBank && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-dark/20">
                            <div>
                                <label className="font-bold text-text-secondary">رقم الحساب</label>
                                <input type="text" name="accountNumber" value={formData.accountNumber || ''} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                            </div>
                            <div>
                                <label className="font-bold text-text-secondary">الدولة</label>
                                <input type="text" name="country" value={formData.country || ''} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                            </div>
                             <div>
                                <label className="font-bold text-text-secondary">الهاتف</label>
                                <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.phone ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                            </div>
                            <div>
                                <label className="font-bold text-text-secondary">البريد الإلكتروني</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.email ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>
                        </div>
                    )}
                     <div className="pt-6 flex justify-end gap-4">
                        <button type="button" onClick={handleClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إلغاء</button>
                        <button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BankSafeFormModal;