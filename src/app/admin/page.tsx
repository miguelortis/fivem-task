'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Users } from 'lucide-react';
import Link from 'next/link';

type UserData = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved';
  createdAt: string;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        // Actualizar el estado local para reflejar el cambio instantáneamente
        setUsers(users.map(u => (u._id === id ? updatedUser : u)));
      }
    } catch (error) {
      console.error("Error modificando usuario:", error);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex justify-center items-center text-neutral-400">Cargando panel...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex items-center gap-4 border-b border-neutral-800 pb-6">
          <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-500/30">
            <Shield className="text-purple-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Control</h1>
            <p className="text-neutral-400 text-sm mt-1">Gestión de accesos y roles de los desarrolladores</p>
          </div>
          <Link 
            href="/dashboard"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-lg transition-colors border border-neutral-700 text-sm font-medium"
          >
            Volver al Tablero
          </Link>
        </header>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950/50 text-neutral-400 uppercase font-medium border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-200">{user.name}</div>
                      <div className="text-neutral-500 text-xs mt-0.5">{user.email}</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {user.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                          <CheckCircle size={14} /> Aprobado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                          <XCircle size={14} /> Pendiente
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-medium">
                          <Shield size={14} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
                          <Users size={14} /> User
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Botones de Estado */}
                        {user.status === 'pending' ? (
                          <button onClick={() => handleAction(user._id, 'approve')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg transition-colors border border-emerald-500/30">
                            Aprobar
                          </button>
                        ) : (
                          <button onClick={() => handleAction(user._id, 'suspend')} className="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors border border-neutral-700 hover:border-amber-500/30">
                            Suspender
                          </button>
                        )}

                        {/* Botones de Rol */}
                        {user.role === 'user' ? (
                          <button onClick={() => handleAction(user._id, 'makeAdmin')} className="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors border border-neutral-700 hover:border-purple-500/30">
                            Hacer Admin
                          </button>
                        ) : (
                          <button onClick={() => handleAction(user._id, 'makeUser')} className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30">
                            Quitar Admin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                      No hay usuarios registrados en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}