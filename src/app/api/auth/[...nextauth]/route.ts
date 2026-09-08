import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Correo", type: "email", placeholder: "tu@correo.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Faltan credenciales");
        }

        await connectDB();

        // Buscamos al usuario en MongoDB
        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No se encontró ningún usuario con este correo");
        }

        // Verificamos si la contraseña coincide
        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordMatch) {
          throw new Error("Contraseña incorrecta");
        }

        // ¡REGLA DE NEGOCIO CRÍTICA!
        // Verificamos si el admin ya le aprobó la cuenta
        if (user.status !== 'approved') {
          throw new Error("Tu cuenta está pendiente de aprobación por un administrador.");
        }

        // Retornamos los datos que queremos guardar en el token JWT
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    // 1. Cuando se crea/actualiza el token JWT, le inyectamos nuestros campos extra
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // 2. Cuando el frontend pide la sesión, pasamos los datos del token a la sesión pública
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Redirigiremos aquí si no están logueados
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };