import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Wand2 } from 'lucide-react';
import { Task, JournalEntry } from '../types.ts';
import { getTaskSuggestions } from '../services/geminiService.ts';

interface TodoListProps {
  journalEntries: JournalEntry[];
  tasks: Task[];
  addTask: (text: string, date: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ journalEntries, tasks, addTask, toggleTask, removeTask }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    addTask(newTaskText, today);
    setNewTaskText('');
  };

  const handleGetSuggestions = async () => {
      setIsLoading(true);
      try {
          const suggestions = await getTaskSuggestions(journalEntries, tasks);
          suggestions.forEach(suggestion => {
              if (suggestion && !tasks.some(t => t.text === suggestion)) {
                  addTask(suggestion, today);
              }
          });
      } catch (error: any) {
          console.error("Failed to get task suggestions", error);
          alert(`فشل اقتراح المهام: ${error.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  const todaysTasks = tasks.filter(task => task.date === today);

  return (
    <div className="bg-primary p-3 rounded-2xl shadow-neumo">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-extrabold text-text-secondary">مهام اليوم</h2>
        <button onClick={handleGetSuggestions} disabled={isLoading} title="Suggest Tasks with AI" className="text-accent hover:text-accent-dark disabled:text-gray-400 p-2 rounded-full hover:shadow-neumo-sm transition-all">
            {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div> : <Wand2 size={18} />}
        </button>
      </div>
      <form onSubmit={handleAddTask} className="flex mb-3">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="إضافة مهمة جديدة..."
          className="flex-grow p-2 bg-primary rounded-r-md text-sm shadow-neumo-inset-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button type="submit" className="px-3 py-1 bg-accent text-white rounded-l-md hover:bg-accent-dark font-bold text-sm">إضافة</button>
      </form>
      <ul className="space-y-2 max-h-32 overflow-y-auto">
        {todaysTasks.map(task => (
          <li key={task.id} className="flex items-center text-sm group p-1 rounded-md hover:bg-primary-light/50">
            <button onClick={() => toggleTask(task.id)} className="mr-2 text-text-secondary">
              {task.completed ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} />}
            </button>
            <span className={`flex-grow ${task.completed ? 'line-through text-text-secondary/70' : 'text-text-primary'}`}>
              {task.text}
            </span>
            <button onClick={() => removeTask(task.id)} className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={16} />
            </button>
          </li>
        ))}
        {todaysTasks.length === 0 && <p className="text-center text-text-secondary text-sm py-4">لا توجد مهام لهذا اليوم.</p>}
      </ul>
    </div>
  );
};

export default TodoList;