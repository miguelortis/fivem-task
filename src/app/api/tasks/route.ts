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
      .populate("assignedTo", "name email")
      .sort({ order: 1, createdAt: -1 }); // Primero por orden numérico, luego por fecha

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
    const { title, type, priority, targetUserId, images } = body;

    if (!title) return NextResponse.json({ message: "El título es obligatorio" }, { status: 400 });

    await connectDB();

    const totalTasks = await Task.countDocuments({ status: "todo" });

    // Creador: Siempre el usuario logueado (ej: el Admin)
    const creatorId = session.user.id;
    
    // Asignado: Si el admin está en el panel de otro dev (targetUserId), se le asigna a él. Si no, se auto-asigna.
    const assignedId = (session.user.role === 'admin' && targetUserId) ? targetUserId : session.user.id;

    const newTask = await Task.create({
      title,
      type: type || 'feature',
      priority: priority || 'medium',
      status: 'todo',
      order: totalTasks,
      createdBy: creatorId,
      assignedTo: assignedId,
      images: images || []
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("assignedTo", "name email");

    return NextResponse.json(populatedTask, { status: 201 });
  } catch (error) {
    console.error("Error creando tarea:", error);
    return NextResponse.json({ message: "Error al crear tarea" }, { status: 500 });
  }
}