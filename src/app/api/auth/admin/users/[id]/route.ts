import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
    }

    // Asegurarse de que Params se resuelva correctamente en App Router
    const { id } = await params;
    const { action } = await req.json();

    await connectDB();

    let updateData = {};

    switch (action) {
      case "approve":
        updateData = { status: "approved" };
        break;
      case "suspend":
        updateData = { status: "pending" };
        break;
      case "makeAdmin":
        updateData = { role: "admin" };
        break;
      case "makeUser":
        updateData = { role: "user" };
        break;
      default:
        return NextResponse.json({ message: "Acción no válida" }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ message: "Error actualizando usuario" }, { status: 500 });
  }
}