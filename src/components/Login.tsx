import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, ShieldCheck, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (!userDoc.exists()) {
        const role = userCred.user.email === 'seshhhhh40@gmail.com' ? 'admin' : 'input-only';
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email: userCred.user.email,
          role,
          displayName: userCred.user.displayName || userCred.user.email?.split('@')[0]
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal login dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // Default role is input-only for new users
        // Unless it's the bootstrapped admin email
        const role = email === 'seshhhhh40@gmail.com' ? 'admin' : 'input-only';
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email,
          role,
          displayName: email.split('@')[0]
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Metode login Email/Password belum diaktifkan di Firebase Console. Silakan aktifkan di menu Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Terjadi kesalahan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-2xl border border-white/20"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-100 rounded-3xl text-blue-600 mb-4">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-800">Control Piket</h1>
          <p className="text-gray-500 mt-2">Sistem Monitoring Kedisiplinan Siswa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 ml-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              placeholder="nama@sekolah.id"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 ml-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-rose-500 text-sm font-medium text-center bg-rose-50 py-2 rounded-xl border border-rose-100">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? "Memproses..." : (isLogin ? <><LogIn size={20} /> Masuk</> : <><UserPlus size={20} /> Daftar</>)}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm font-medium">atau</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-6 py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm"
        >
          <Chrome size={20} className="text-blue-500" />
          Masuk dengan Google
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
