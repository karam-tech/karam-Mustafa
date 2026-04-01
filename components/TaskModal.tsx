import React, { useState } from 'react';
import { Task } from '../types';
import { X, CheckSquare, Square, Trash2 } from 'lucide-react';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    tasksForDay: Task[];
    addTask: (text: string, date: string) => void;
    toggleTask: (id: string) => void;
    removeTask: (id: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, selectedDate, tasksForDay, addTask, toggleTask, removeTask }) => {
    const [newTaskText, setNewTaskText] = useState('');

    if (!isOpen) return null;

    const dateString = selectedDate.toISOString().split('T')[0];
    const formattedDate = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full' }).format(selectedDate);
    
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if(newTaskText.trim()) {
            addTask(newTaskText, dateString);
            setNewTaskText('');
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-extrabold text-slate-800">مهام يوم: {formattedDate}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><X size={24} /></button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {tasksForDay.length > 0 ? tasksForDay.map(task => (
                        <div key={task.id} className="flex items-center group p-2 rounded-md hover:shadow-neumo-sm">
                            <button onClick={() => toggleTask(task.id)} className="mr-3 text-text-secondary">
                                {task.completed ? <CheckSquare size={20} className="text-green-600" /> : <Square size={20} />}
                            </button>
                            <span className={`flex-grow ${task.completed ? 'line-through text-gray-400' : 'text-text-primary'}`}>
                                {task.text}
                            </span>
                            <button onClick={() => removeTask(task.id)} className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )) : <p className="text-center text-text-secondary py-4">لا توجد مهام لهذا اليوم.</p>}
                </div>
                
                <form onSubmit={handleAddTask} className="flex mt-4">
                    <input
                        type="text"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="إضافة مهمة جديدة..."
                        className="flex-grow p-3 bg-primary rounded-r-md shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button type="submit" className="px-4 py-2 bg-accent text-white rounded-l-md hover:bg-accent-dark font-bold">إضافة</button>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;