'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bug } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Usamos el provider "credentials" definido en NextAuth
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false, // Evitamos que NextAuth recargue la página automáticamente
      });

      if (res?.error) {
        setError(res.error);
      } else {
        // Si todo sale bien, redirigimos al tablero principal
        router.push('/dashboard');
        router.refresh(); // Fuerza a recargar el estado del servidor
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-200 p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500/20 p-3 rounded-full mb-3">
            <Bug className="text-emerald-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Dev Login</h1>
          <p className="text-neutral-500 text-sm mt-1">Gestión de Tareas FiveM</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
          >
            {isLoading ? 'Conectando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          ¿No tienes acceso? <Link href="/register" className="text-emerald-400 hover:underline">Solicítalo aquí</Link>
        </p>
      </div>
    </div>
  );
}