import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TaskModal from './TaskModal';

interface TaskCalendarProps {
  tasks: Task[];
  addTask: (text: string, date: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({ tasks, addTask, toggleTask, removeTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(clickedDate);
        setIsModalOpen(true);
    }
    
    const renderHeader = () => {
        const dateFormat = new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long' });
        return (
            <div className="flex justify-between items-center p-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-extrabold text-slate-800">{dateFormat.format(currentDate)}</h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:shadow-neumo-sm transition-all"><ChevronLeft size={24} /></button>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return (
            <div className="grid grid-cols-7 text-center font-extrabold text-text-secondary text-sm">
                {days.map(day => <div key={day} className="p-2">{day}</div>)}
            </div>
        );
    };

    const calendarCells = useMemo(() => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        if (endDate.getDay() !== 6) {
             endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        }

        const cells = [];
        let day = new Date(startDate);

        while (day <= endDate) {
            const dayISO = day.toISOString().split('T')[0];
            const tasksForDay = tasks.filter(task => task.date === dayISO);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = new Date().toISOString().split('T')[0] === dayISO;

            cells.push(
                <div
                    key={day.toISOString()}
                    className={`
                        p-2 border border-primary-dark/10 h-32 flex flex-col transition-all duration-200 overflow-hidden relative
                        ${isCurrentMonth ? 'bg-primary hover:shadow-neumo-sm cursor-pointer' : 'bg-primary-dark/20 text-text-secondary'}
                        ${isToday ? 'shadow-neumo-inset ring-2 ring-accent' : ''}
                    `}
                    onClick={() => isCurrentMonth && handleDayClick(day.getDate())}
                >
                    <span className={`font-extrabold ${isToday ? 'text-accent' : ''}`}>{day.getDate()}</span>
                    <div className="flex-grow overflow-y-auto text-xs mt-1 space-y-1">
                        {tasksForDay.slice(0, 3).map(task => (
                            <div key={task.id} title={task.text} className={`p-1 rounded truncate ${task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                {task.text}
                            </div>
                        ))}
                        {tasksForDay.length > 3 && <div className="text-center text-slate-500 font-extrabold mt-1">...</div>}
                    </div>
                </div>
            );
            day.setDate(day.getDate() + 1);
        }

        return cells;

    }, [currentDate, tasks]);
    
    const selectedDateTasks = selectedDate ? tasks.filter(task => task.date === selectedDate.toISOString().split('T')[0]) : [];

    return (
        <div className="bg-primary p-4 rounded-2xl shadow-neumo">
            {renderHeader()}
            {renderDays()}
            <div className="grid grid-cols-7">{calendarCells}</div>

            {selectedDate && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedDate={selectedDate}
                    tasksForDay={selectedDateTasks}
                    addTask={addTask}
                    toggleTask={toggleTask}
                    removeTask={removeTask}
                />
            )}
        </div>
    );
};

export default TaskCalendar;