import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";

// Obtener tareas (Lectura)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    await connectDB();

    let query = {};

    // Si NO es admin, filtramos para que solo vea las tareas que se le asignaron a él
    // o las que él mismo creó (por si reportó un bug)
    if (session.user.role !== "admin") {
      query = {
        $or: [
          { assignedTo: session.user.id },
          { createdBy: session.user.id }
        ]
      };
    }

    // Buscamos las tareas y hacemos "populate" para obtener los nombres de los usuarios
    // en lugar de solo sus IDs técnicos.
    const tasks = await Task.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name")
      .populate("lastModifiedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar tareas" }, { status: 500 });
  }
}

// Crear una nueva tarea
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { title, description, type, priority, assignedTo, tags, deadline } = body;

    await connectDB();

    const newTask = await Task.create({
      title,
      description,
      type,
      priority,
      tags,
      assignedTo: assignedTo || null,
      createdBy: session.user.id, // Se registra quién la creó automáticamente
      deadline: deadline ? new Date(deadline) : null,
      status: "todo", // Por defecto caen en "Por Hacer"
    });

    // Hacemos populate para devolver la tarea con el nombre del creador/asignado
    const populatedTask = await Task.findById(newTask._id)
      .populate("assignedTo", "name")
      .populate("createdBy", "name");

    return NextResponse.json(populatedTask, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error al crear tarea" }, { status: 500 });
  }
}