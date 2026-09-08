import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  // Extendemos la sesión pública (lo que llega al cliente)
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"]
  }

  // Extendemos el User (lo que retornamos en la función authorize)
  interface User {
    id: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  // Extendemos el token interno
  interface JWT {
    id: string;
    role: string;
  }
}