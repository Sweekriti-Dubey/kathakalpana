import React,{ useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {Book, LogOut } from 'lucide-react';
import Login from './components/Login';
import Library from './components/Library';
import StoryGenerator from './components/StoryGenerator';
import StoryReader from './components/StoryReader';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    const handleLogin = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const ProtectedRoute = ({ children }: {children: React.ReactNode }) => {
        if(!token) return <Navigate to = "/login" replace />;

        return<>{children}</>;
    };

    return (
        <Router>
            <div className="min-height-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-purple-500/30">
                <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-md bg-neutral-900/60 border-b border-neutral-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
                        Katha Kalpana
                    </h1>
                    <div className="flex-items-center gap-6 text-sm font-medium">
                        <Link to="/" className="hover:text-purple-400 transition-colors">Home</Link>
                        {token && (
                            <>
                                <Link to="/generate" className="hover:text-purple-400 transition-colors">Create</Link>
                                <Link to="/library" className="hover:text-purple-400 transition-colors">Library</Link>
                            </>
                        )}
                        { token ? (
                            <button onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-red-900/40 rounded-full border-neutral-700 transition-all">
                                <LogOut size={16} />Logout
                            </button>
                        ): (
                            <Link to="/login" className="px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded-full transition-all shadow-purple-500/20">
                                Login
                            </Link>
                        )}
                    </div>
                </nav>

                {/*Main Content Area */}
                <main className="max-w-6xl mx-auto p-6">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/generate" element={<ProtectedRoute><StoryGenerator token={token!} /></ProtectedRoute>} />
                        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                        <Route path="/read" element={<ProtectedRoute><StoryReader /></ProtectedRoute>} />
                    </Routes>
                </main>
            
            </div>
             
        </Router>
    );


};

//Landing Page Sub-Component
const HomePage = () => {
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <h1 className="relative text-6xl font-extrabold mb-6 tracking-tight">
                Where <span className="text-purple-500">Imagination</span> Lives
            </h1>
        </div>
        <p className="text-xl text-neutral-400 mb-10 max-w-2xl">
            Bring stories to life with AI-powered narration and magical illustrations.
        </p>
        <Link to="/generate" className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 rounded-2xl text-lg font-bolde hover:scale-105 transition-all shadow-xl shadow-purple-900/20">
        Get Started <Book className="group-hover:rotate-12 transition-transform"/>
        
        </Link>
    </div>
};

export default App;