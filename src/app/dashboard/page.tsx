import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="p-10 text-white">
      <h1>Bienvenido al Dashboard, {session?.user?.name}</h1>
      <p>Tu rol es: {session?.user?.role}</p>
    </div>
  );
}