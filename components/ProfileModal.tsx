import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Save } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    updateUser: (user: User) => void;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger'; showCancel?: boolean }) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, updateUser, requestConfirmation }) => {
    const [username, setUsername] = useState(currentUser.username);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUsername(currentUser.username);
            setNewPassword('');
            setConfirmPassword('');
            setError('');
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتين.');
            return;
        }

        const updatedUser: User = {
            ...currentUser,
            username: username,
        };

        if (newPassword) {
            updatedUser.password = newPassword;
        }
        
        updateUser(updatedUser);
        requestConfirmation({
            title: 'تم التحديث',
            message: 'تم تحديث الملف الشخصي بنجاح!',
            onConfirm: () => {},
            showCancel: false,
            variant: 'primary'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-text-primary">تعديل الملف الشخصي</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="font-bold text-text-secondary">اسم المستخدم</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                            className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                     <div>
                        <label className="font-bold text-text-secondary">كلمة المرور الجديدة</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="اتركه فارغاً لعدم التغيير" 
                            className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                     <div>
                        <label className="font-bold text-text-secondary">تأكيد كلمة المرور الجديدة</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="اتركه فارغاً لعدم التغيير" 
                            className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-center">{error}</p>}
                    <div className="pt-4 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إلغاء</button>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold">
                            <Save size={18} /> حفظ التغييرات
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;