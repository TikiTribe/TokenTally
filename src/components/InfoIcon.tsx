/**
 * InfoIcon Component
 * 
 * Consistent information icon for tooltips.
 * Size: 16x16px for inline use with labels
 * Color: text-gray-400 (neutral), hover: text-gray-600
 */

interface InfoIconProps {
  className?: string;
}

export function InfoIcon({ className = '' }: InfoIconProps) {
  return (
    <svg
      className={`inline-block w-4 h-4 ml-1 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}
