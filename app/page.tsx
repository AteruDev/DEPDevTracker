import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F5EF] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 border border-[#DDD7C8] shadow-sm max-w-md w-full rounded">
        <h1 className="text-2xl font-semibold text-[#1B2A44] mb-2 text-center">
          Document Tracker
        </h1>
        <p className="text-sm text-[#6B6A63] text-center mb-8">
          Regional Development Council · Negros Island Region
        </p>

        <div className="flex flex-col gap-4">
          <Link 
            href="/sec" 
            className="w-full bg-[#2A4B7C] text-white text-center py-3 text-sm font-medium hover:bg-[#20395F] transition-colors"
          >
            Enter as Secretariat
          </Link>
          
          <Link 
            href="/ard" 
            className="w-full bg-white border border-[#2A4B7C] text-[#2A4B7C] text-center py-3 text-sm font-medium hover:bg-[#F0F4F8] transition-colors"
          >
            Enter as ARD
          </Link>
          
          <Link 
            href="/rd" 
            className="w-full bg-white border border-[#2A4B7C] text-[#2A4B7C] text-center py-3 text-sm font-medium hover:bg-[#F0F4F8] transition-colors"
          >
            Enter as RD
          </Link>
        </div>
      </div>
    </main>
  );
}