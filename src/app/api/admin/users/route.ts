import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
    }

    await connectDB();

    // Traemos a todos los usuarios EXCEPTO al administrador que ha iniciado sesión
    const users = await User.find({ _id: { $ne: session.user.id } })
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: "Error al obtener usuarios" }, { status: 500 });
  }
}