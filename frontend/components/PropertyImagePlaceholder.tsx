// public/placeholder-property.jpg (we need to create this)
// For now, we'll create a simple SVG placeholder component

// components/PropertyImagePlaceholder.tsx

export default function PropertyImagePlaceholder() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: '#f3f4f6' }}
    >
      <rect width="800" height="600" fill="#e5e7eb" />
      <path
        d="M400 200 L550 300 L550 450 L250 450 L250 300 Z"
        fill="#d1d5db"
        stroke="#9ca3af"
        strokeWidth="3"
      />
      <rect x="320" y="350" width="80" height="100" fill="#9ca3af" />
      <rect x="480" y="350" width="50" height="50" fill="#6b7280" />
      <circle cx="400" cy="320" r="30" fill="#fbbf24" opacity="0.5" />
      <text
        x="400"
        y="520"
        textAnchor="middle"
        fill="#6b7280"
        fontSize="24"
        fontFamily="Arial, sans-serif"
      >
        Property Image
      </text>
    </svg>
  );
}
