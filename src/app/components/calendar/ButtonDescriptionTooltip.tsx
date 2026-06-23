/**
 * Tooltip component to show helpful descriptions for buttons
 */
export function ButtonDescriptionTooltip({ children, description }: { children: React.ReactNode; description: string }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
        {description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
