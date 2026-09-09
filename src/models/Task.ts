import mongoose, { Schema, models } from 'mongoose';

const NoteSchema = new Schema({
  text: { type: String, required: true }, // Soportará Markdown en el frontend
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: { 
      type: String, 
      enum: ['todo', 'inProgress', 'done'], 
      default: 'todo' 
    },
    order: { type: Number, default: 0 },
    type: { 
      type: String, 
      enum: ['bug', 'feature', 'tweak', 'optimization', 'research'], 
      required: true 
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    tags: [{ type: String }], // Ej: ['QBCore', 'UI', 'Vehículos']
    
    // Trazabilidad y Permisos
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    imageUrl: { type: String, default: null },
    deadline: { type: Date },
    notes: [NoteSchema] // Historial de comentarios
  },
  { timestamps: true }
);

const Task = models.Task || mongoose.model('Task', TaskSchema);
export default Task;