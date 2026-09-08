import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Validar que vengan todos los datos
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Todos los campos son obligatorios" }, { status: 400 });
    }

    await connectDB();

    // Verificar si el correo ya está registrado
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ message: "El correo ya está registrado" }, { status: 400 });
    }

    // Encriptar la contraseña (costo de 10 es el estándar recomendado)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario. Por defecto, mongoose le asignará role: 'user' y status: 'pending'
    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return NextResponse.json({ message: "Usuario registrado con éxito" }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json({ message: "Ocurrió un error en el servidor" }, { status: 500 });
  }
}