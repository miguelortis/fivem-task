import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Proteger rutas exclusivas de Administradores
    // Si la URL empieza con /admin, verificamos que el rol sea admin
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.rewrite(new URL("/denied", req.url)); 
    }
  },
  {
    callbacks: {
      // Si esta función retorna true, el usuario puede acceder a la ruta protegida.
      // Si retorna false, es redirigido al login.
      authorized: ({ token }) => !!token,
    },
  }
);

// Definimos qué rutas queremos proteger
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*", // Protege todo dentro del panel principal
    "/admin/:path*",     // Protege el panel de administración
    "/api/tasks/:path*", // Protege las rutas de la API de tareas
  ]
};