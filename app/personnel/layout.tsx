import Navbar from '@/components/Navbar';

export default function PersonnelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  );
}
