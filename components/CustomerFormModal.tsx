
import React, { useState, useEffect } from 'react';
import { Account, PriceList } from '../types.ts';
import { X } from 'lucide-react';
import { validateEmail, validatePhone, validateTaxId } from '../utils/validation.ts';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Account | Omit<Account, 'id' | 'type'>) => void;
  initialData?: Account | null;
  priceLists: PriceList[];
  requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger' }) => void;
}

const BLANK_FORM_DATA: Omit<Account, 'id' | 'type'> = {
    name: '',
    phone: '', email: '', address: '', taxNumber: '',
    bankName: '', bankAccountNumber: '', bankCurrency: '',
    currency: 'EGP',
    notes: '',
    creditLimit: 0,
    paymentTerms: '',
    contactPerson: '',
    priceListId: '',
};

type FormErrors = Partial<Record<keyof Account, string>>;

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSubmit, initialData, priceLists, requestConfirmation }) => {
    const [formData, setFormData] = useState<Omit<Account, 'id' | 'type'>>(BLANK_FORM_DATA);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isFormDirty, setIsFormDirty] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setIsFormDirty(false);
            if (initialData) {
                // Remove prefix for editing
                const { name, ...rest } = initialData;
                setFormData({ 
                    ...BLANK_FORM_DATA, 
                    ...rest, 
                    name: name.replace(/^العملاء - /, '') 
                });
            } else {
                setFormData(BLANK_FORM_DATA);
            }
        }
    }, [initialData, isOpen]);

    // Cleanup on unmount to ensure no stuck state
    useEffect(() => {
        return () => setIsFormDirty(false);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setIsFormDirty(true);
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) newErrors.name = "اسم العميل مطلوب.";
        if (formData.email) newErrors.email = validateEmail(formData.email) || undefined;
        if (formData.phone) newErrors.phone = validatePhone(formData.phone) || undefined;
        if (formData.taxNumber) newErrors.taxNumber = validateTaxId(formData.taxNumber) || undefined;
        
        setErrors(newErrors);
        return Object.keys(newErrors).filter(k => newErrors[k as keyof FormErrors]).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            if (initialData) {
                onSubmit({ ...initialData, ...formData, name: `العملاء - ${formData.name}` });
            } else {
                onSubmit({ ...formData, type: 'Asset' });
            }
            setIsFormDirty(false);
            onClose();
        }
    };

    const handleClose = () => {
        if (isFormDirty) {
            requestConfirmation({
                title: 'تغييرات غير محفوظة',
                message: 'لديك تغييرات غير محفوظة. هل أنت متأكد من الإغلاق؟',
                onConfirm: () => {
                    setIsFormDirty(false);
                    onClose();
                },
                variant: 'danger'
            });
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    const title = initialData ? 'تعديل بيانات عميل' : 'إضافة عميل جديد';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={handleClose}>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-extrabold text-slate-700 border-b pb-2">المعلومات الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="md:col-span-2">
                            <label className="font-bold text-text-secondary">اسم العميل</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.name ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                         <div>
                            <label className="font-bold text-text-secondary">عملة الحساب</label>
                            <input type="text" name="currency" value={formData.currency || 'EGP'} onChange={handleChange} placeholder="EGP" className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                        <div>
                            <label className="font-bold text-text-secondary">الرقم الضريبي</label>
                            <input type="text" name="taxNumber" value={formData.taxNumber || ''} onChange={handleChange} placeholder="XXX-XXX-XXX" className={`w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm ${errors.taxNumber ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-accent'}`}/>
                            {errors.taxNumber && <p className="text-red-500 text-xs mt-1">{errors.taxNumber}</p>}
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
                        <div>
                            <label className="font-bold text-text-secondary">مسؤول التواصل</label>
                            <input type="text" name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                        <div>
                            <label className="font-bold text-text-secondary">حد الائتمان</label>
                            <input type="number" name="creditLimit" value={formData.creditLimit || 0} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                        <div>
                            <label className="font-bold text-text-secondary">شروط الدفع</label>
                            <input type="text" name="paymentTerms" value={formData.paymentTerms || ''} onChange={handleChange} placeholder="مثال: صافي 30 يوم" className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                        <div className="col-span-full">
                            <label className="font-bold text-text-secondary">العنوان</label>
                            <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={2} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                        <div className="col-span-full">
                            <label className="font-bold text-text-secondary">قائمة الأسعار الافتراضية</label>
                            <select
                                name="priceListId"
                                value={formData.priceListId || ''}
                                onChange={handleChange}
                                className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:ring-2 focus:ring-accent"
                            >
                                <option value="">-- بدون قائمة أسعار --</option>
                                {priceLists.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-full">
                            <label className="font-bold text-text-secondary">ملاحظات</label>
                            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={2} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-700 border-b pb-2 pt-4">البيانات البنكية</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="font-bold text-text-secondary">اسم البنك</label>
                            <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                         <div>
                            <label className="font-bold text-text-secondary">رقم الحساب</label>
                            <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                         <div>
                            <label className="font-bold text-text-secondary">عملة الحساب</label>
                            <input type="text" name="bankCurrency" value={formData.bankCurrency || ''} onChange={handleChange} placeholder="EGP, USD..." className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:ring-2 focus:ring-accent"/>
                        </div>
                    </div>

                     <div className="pt-6 flex justify-end gap-4">
                        <button type="button" onClick={handleClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إلغاء</button>
                        <button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
