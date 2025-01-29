import Link from "next/link";

export function NotebookCard({ notebook }: { notebook: any }) {
  return (
    <Link href={`/notebook/${notebook.id}`} className="block">
      <div className="border border-[#2A2A2A] rounded-lg p-4 hover:border-[#404040] transition-colors">
        {/* ... rest of the card content ... */}
      </div>
    </Link>
  );
}
