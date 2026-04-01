import React, { useState, useMemo } from 'react';
import { User, Role } from '../types';
import { PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// --- User Form Modal ---
interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (user: User | Omit<User, 'id'>) => void;
    initialData?: User | null;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger'; showCancel?: boolean }) => void;
}

const UserFormModal: React.FC<UserFormProps> = ({ isOpen, onClose, onSubmit, initialData, requestConfirmation }) => {
    const [formData, setFormData] = useState(initialData || { username: '', password: '', role: 'clerk' as Role });

    React.useEffect(() => {
        if(isOpen) {
            setFormData(initialData || { username: '', password: '', role: 'clerk' as Role });
        }
    }, [initialData, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Using a simpler state update to avoid potential transpilation issues
        // with more complex type inference in the previous implementation.
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || (!initialData && !formData.password)) {
            requestConfirmation({
                title: 'بيانات ناقصة',
                message: "الرجاء إدخال اسم المستخدم وكلمة المرور.",
                onConfirm: () => {},
                showCancel: false,
                variant: 'danger'
            });
            return;
        }
        // The form data is cast here to ensure it matches the expected type for the onSubmit function.
        onSubmit(formData as User | Omit<User, 'id'>);
        onClose();
    };

    if (!isOpen) return null;

    const roleOptions: { value: Role, label: string }[] = [
        { value: 'admin', label: 'مسؤول' },
        { value: 'accountant', label: 'محاسب' },
        { value: 'clerk', label: 'كاتب' },
        { value: 'viewer', label: 'مطلع' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-primary p-8 rounded-2xl shadow-neumo w-full max-w-md">
                <h2 className="text-2xl font-extrabold mb-6 text-slate-800">{initialData ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="font-bold text-text-secondary">اسم المستخدم</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm"/>
                    </div>
                     <div>
                        <label className="font-bold text-text-secondary">كلمة المرور</label>
                        <input type="password" name="password" value={formData.password || ''} onChange={handleChange} required={!initialData} placeholder={initialData ? "اتركه فارغاً لعدم التغيير" : ""} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm"/>
                    </div>
                    <div>
                        <label className="font-bold text-text-secondary">الدور</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full mt-1 p-3 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none">
                            {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold">إلغاء</button>
                        <button type="submit" className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main User Management Component ---
interface UserManagementProps {
    users: User[];
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (user: User) => void;
    deleteUser: (id: string) => void;
    requestConfirmation: (params: { title: string; message: string; onConfirm: () => void; variant?: 'primary' | 'danger'; showCancel?: boolean }) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, addUser, updateUser, deleteUser, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [filterRole, setFilterRole] = useState<Role | 'all'>('all');

    const handleAddNew = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setCurrentUser({ ...user, password: '' }); // Clear password for edit form
        setIsModalOpen(true);
    };

    const handleSubmit = (data: User | Omit<User, 'id'>) => {
        if ('id' in data) {
            const userToUpdate = { ...data };
            // If password is not changed, keep the original one
            if (!userToUpdate.password) {
                const originalUser = users.find(u => u.id === userToUpdate.id);
                userToUpdate.password = originalUser?.password;
            }
            updateUser(userToUpdate);
        } else {
            addUser(data);
        }
    };

    const roleNames: Record<Role, string> = {
        admin: 'مسؤول',
        accountant: 'محاسب',
        clerk: 'كاتب',
        viewer: 'مطلع',
    };

    const filteredUsers = useMemo(() => {
        if (filterRole === 'all') {
            return users;
        }
        return users.filter(user => user.role === filterRole);
    }, [users, filterRole]);

    return (
        <div className="space-y-8">
            <UserFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={currentUser}
                requestConfirmation={requestConfirmation}
            />

            <div className="bg-primary p-6 rounded-2xl shadow-neumo">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="roleFilter" className="font-bold text-text-secondary">فلترة حسب الدور:</label>
                        <select
                            id="roleFilter"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value as Role | 'all')}
                            className="p-2 bg-primary rounded-xl shadow-neumo-inset-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="all">الكل</option>
                            <option value="admin">مسؤول</option>
                            <option value="accountant">محاسب</option>
                            <option value="clerk">كاتب</option>
                            <option value="viewer">مطلع</option>
                        </select>
                    </div>
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-bold shadow-sm">
                        <PlusCircle size={20} /> إضافة مستخدم
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-primary-dark/30">
                                <th className="p-3 font-extrabold text-lg text-slate-800">اسم المستخدم</th>
                                <th className="p-3 font-extrabold text-lg text-slate-800">الدور</th>
                                <th className="p-3 font-extrabold text-lg text-slate-800">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-primary-dark/20">
                                    <td className="p-3 font-bold text-slate-800">{user.username}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 text-sm font-bold rounded-full bg-primary-dark/20 text-text-secondary">
                                            {roleNames[user.role]}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(user)} className="p-2 text-accent rounded-full hover:shadow-neumo-sm" title="تعديل">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => deleteUser(user.id)} className="p-2 text-red-500 rounded-full hover:shadow-neumo-sm" title="حذف">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center p-8 text-text-secondary">
                                        لا يوجد مستخدمون يطابقون الفلتر الحالي.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;