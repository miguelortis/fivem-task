import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Verificamos que esté logueado y sea admin
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
    }

    await connectDB();

    // Traemos todos los usuarios sin mostrar las contraseñas
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: "Error al obtener usuarios" }, { status: 500 });
  }
}