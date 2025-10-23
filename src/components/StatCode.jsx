// StatCard.jsx
export default function StatCard({ label, value, highlight, onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className={`rounded-lg p-4 border bg-white shadow-sm cursor-pointer hover:bg-neutral-200 duration-200 ${
        highlight ? 'border-red-400 bg-red-50' : ''
      } ${
        clickable
          ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          : ''
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
