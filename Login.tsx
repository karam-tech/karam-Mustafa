import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary font-sans p-4 relative">
      <div className="w-full max-w-md">
        <div className="bg-primary p-8 rounded-2xl shadow-neumo">
            <div className="flex flex-col items-center justify-center mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-800 leading-tight">
                    شركة إيجيبشن إكسبريس للشحن والتجارة
                </h1>
                <h2 className="text-2xl font-semibold text-slate-700 mt-6">
                    المساعد المحاسبي
                </h2>
                <p className="text-sm text-text-secondary">المدعوم بالذكاء الاصطناعي</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-700 font-bold mb-2" htmlFor="username">
                اسم المستخدم
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full p-4 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-2" htmlFor="password">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-4 bg-primary rounded-xl shadow-neumo-inset-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-center font-semibold">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent text-white rounded-xl hover:bg-accent-dark font-bold text-lg shadow-md hover:shadow-lg transition-all"
              >
                <LogIn size={22} />
                <span>تسجيل الدخول</span>
              </button>
            </div>
          </form>
        </div>
      </div>
       <footer className="absolute bottom-4 right-4 text-sm text-text-secondary">
        تم بحمد الله بواسطة كرم سيد مصطفى
      </footer>
    </div>
  );
};

export default Login;