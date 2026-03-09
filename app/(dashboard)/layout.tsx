import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Load profile if user is authenticated
  let _profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    _profile = data;
  }

  return (
    <div className="h-screen flex bg-[#fafafa] overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Header />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
