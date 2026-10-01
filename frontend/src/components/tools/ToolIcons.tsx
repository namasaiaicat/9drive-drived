interface ToolIconProps {
  className?: string
  size?: number
}

// 1. Merge PDF - Red badge with overlapping documents and merge arrow
export function MergePdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#E5322D" />
      {/* Back Document */}
      <rect x="15" y="12" width="18" height="24" rx="2.5" fill="#FFFFFF" fillOpacity="0.45" />
      {/* Front Document */}
      <rect x="23" y="19" width="18" height="24" rx="2.5" fill="#FFFFFF" />
      {/* Inner lines on front doc */}
      <rect x="27" y="24" width="10" height="2" rx="1" fill="#E5322D" fillOpacity="0.5" />
      <rect x="27" y="29" width="8" height="2" rx="1" fill="#E5322D" fillOpacity="0.5" />
      {/* Merge Arrow Badge */}
      <circle cx="21" cy="35" r="7" fill="#B71C1C" />
      <path
        d="M21 31V39M21 39L18.5 36.5M21 39L23.5 36.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 2. Split PDF - Orange-red badge with a document cut into pieces
export function SplitPdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#FF5436" />
      {/* Left half doc */}
      <path
        d="M14 15C14 13.3431 15.3431 12 17 12H25V42H17C15.3431 42 14 40.6569 14 39V15Z"
        fill="#FFFFFF"
      />
      {/* Right half doc */}
      <path
        d="M31 12H39C40.6569 12 42 13.3431 42 15V39C42 40.6569 40.6569 42 39 42H31V12Z"
        fill="#FFFFFF"
      />
      {/* Cut gap / scissor */}
      <path
        d="M28 12V42"
        stroke="#FF5436"
        strokeWidth="2.5"
        strokeDasharray="3 3"
      />
      {/* Scissor icon badge */}
      <circle cx="28" cy="27" r="7" fill="#C62828" />
      <path
        d="M25.5 25L30.5 29M25.5 29L30.5 25"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 3. Compress PDF - Green badge with 4 inward pointing compression arrows
export function CompressPdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#10B981" />
      {/* Central Document */}
      <rect x="18" y="14" width="20" height="28" rx="3" fill="#FFFFFF" />
      {/* Lines inside doc */}
      <rect x="22" y="20" width="12" height="2.5" rx="1" fill="#10B981" fillOpacity="0.4" />
      <rect x="22" y="25" width="8" height="2.5" rx="1" fill="#10B981" fillOpacity="0.4" />
      {/* 4 Inward Arrowheads */}
      <path
        d="M13 13L19 19M19 19V14M19 19H14"
        stroke="#047857"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M43 13L37 19M37 19V14M37 19H42"
        stroke="#047857"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 43L19 37M19 37V42M19 37H14"
        stroke="#047857"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M43 43L37 37M37 37V42M37 37H42"
        stroke="#047857"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 4. Images to PDF - Amber-gold badge with photo transitioning to document
export function ImagesToPdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#F59E0B" />
      {/* Image frame */}
      <rect x="13" y="14" width="22" height="26" rx="3" fill="#FFFFFF" />
      <circle cx="19" cy="20" r="2.5" fill="#F59E0B" />
      <path
        d="M15 34L21 27L26 32L29 29L33 34H15Z"
        fill="#F59E0B"
      />
      {/* Front PDF Document */}
      <rect x="25" y="18" width="18" height="24" rx="2.5" fill="#E5322D" />
      <text
        x="34"
        y="33"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        PDF
      </text>
    </svg>
  )
}

// 5. Rotate PDF - Purple badge with curved 360-degree rotation arrow
export function RotatePdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#7C3AED" />
      {/* Rotated Document in center */}
      <rect
        x="21"
        y="16"
        width="16"
        height="22"
        rx="2.5"
        fill="#FFFFFF"
        transform="rotate(12 29 27)"
      />
      {/* Circular Arrow around page */}
      <path
        d="M39 20C42 24 42 30 38 35C34 40 27 41 21 38C16 35 14 29 16 23C17.5 19 21 16 25 15"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M26 11L28 16L23 18"
        fill="#FFFFFF"
      />
    </svg>
  )
}

// 6. Watermark PDF - Violet/Indigo badge with diagonal watermark stamp
export function WatermarkPdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#8B5CF6" />
      {/* Base Document */}
      <rect x="16" y="12" width="24" height="32" rx="3" fill="#FFFFFF" />
      <rect x="21" y="18" width="14" height="2" rx="1" fill="#8B5CF6" fillOpacity="0.3" />
      <rect x="21" y="23" width="14" height="2" rx="1" fill="#8B5CF6" fillOpacity="0.3" />
      <rect x="21" y="28" width="9" height="2" rx="1" fill="#8B5CF6" fillOpacity="0.3" />
      {/* Diagonal Stamp Badge */}
      <g transform="rotate(-25 28 28)">
        <rect
          x="12"
          y="23"
          width="32"
          height="10"
          rx="2"
          fill="#5B21B6"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        <text
          x="28"
          y="30.5"
          fill="#FFFFFF"
          fontSize="7"
          fontWeight="900"
          textAnchor="middle"
          fontFamily="sans-serif"
          letterSpacing="0.5"
        >
          WATERMARK
        </text>
      </g>
    </svg>
  )
}

// 7. AI Background Remover - Premium violet-magenta gradient badge with neural cutout
export function RemoveBgIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <defs>
        <linearGradient id="ai-cutout-grad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="14" fill="url(#ai-cutout-grad)" />
      {/* Chequered cutout transparency grid background */}
      <rect x="14" y="14" width="28" height="28" rx="4" fill="#FFFFFF" fillOpacity="0.2" />
      <rect x="14" y="14" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="28" y="14" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="21" y="21" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="35" y="21" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="14" y="28" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="28" y="28" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="21" y="35" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="35" y="35" width="7" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      {/* Cutout silhouette profile */}
      <circle cx="26" cy="22" r="5" fill="#FFFFFF" />
      <path
        d="M17 38C17 32.5 21 29 26 29C31 29 35 32.5 35 38H17Z"
        fill="#FFFFFF"
      />
      {/* Magic Wand / Sparkle */}
      <circle cx="39" cy="18" r="2" fill="#FEF08A" />
      <path
        d="M39 13V15M39 21V23M34 18H36M42 18H44"
        stroke="#FEF08A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="43" cy="28" r="1.5" fill="#FEF08A" />
    </svg>
  )
}

// 8. Compress Image - Fresh emerald green badge with photo and inward compression
export function CompressImageIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#059669" />
      {/* Image frame */}
      <rect x="16" y="16" width="24" height="24" rx="4" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2.5" fill="#059669" />
      <path
        d="M18 36L25 29L29 33L33 28L38 36H18Z"
        fill="#059669"
      />
      {/* Top & bottom arrows pushing inward */}
      <path
        d="M28 10V14M28 14L25 12M28 14L31 12"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 46V42M28 42L25 44M28 42L31 44"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 9. Convert Image Format - Cyan/Sky blue badge with circular exchange
export function ConvertImageIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#0284C7" />
      {/* Left card JPG */}
      <rect x="12" y="16" width="16" height="20" rx="3" fill="#FFFFFF" />
      <text x="20" y="29" fill="#0284C7" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        JPG
      </text>
      {/* Right card PNG/WEBP */}
      <rect x="28" y="20" width="16" height="20" rx="3" fill="#FFFFFF" />
      <text x="36" y="33" fill="#0284C7" fontSize="6.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        PNG
      </text>
      {/* Exchange Arrows */}
      <path
        d="M22 13H34M34 13L31 10M34 13L31 16"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 43H22M22 43L25 40M22 43L25 46"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 10. Resize Image - Royal blue badge with transform scale anchor points
export function ResizeImageIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#2563EB" />
      {/* Scaled frame box */}
      <rect
        x="15"
        y="15"
        width="26"
        height="26"
        rx="3"
        fill="#FFFFFF"
        fillOpacity="0.2"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeDasharray="3 3"
      />
      {/* Inner solid frame */}
      <rect x="15" y="15" width="16" height="16" rx="2" fill="#FFFFFF" />
      {/* Corner Scale Anchor Handles */}
      <rect x="13" y="13" width="5" height="5" rx="1" fill="#FFFFFF" />
      <rect x="38" y="13" width="5" height="5" rx="1" fill="#FFFFFF" />
      <rect x="13" y="38" width="5" height="5" rx="1" fill="#FFFFFF" />
      <rect x="38" y="38" width="5" height="5" rx="1" fill="#FFFFFF" />
      {/* Diagonal Expand Arrow */}
      <path
        d="M26 26L37 37M37 37V32M37 37H32"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 11. Watermark Image - Indigo badge with photo stamp
export function WatermarkImageIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#4F46E5" />
      {/* Photo Frame */}
      <rect x="14" y="14" width="28" height="28" rx="4" fill="#FFFFFF" />
      <circle cx="21" cy="21" r="2.5" fill="#4F46E5" />
      <path
        d="M17 37L24 29L29 34L32 30L39 37H17Z"
        fill="#4F46E5"
        fillOpacity="0.6"
      />
      {/* Copyright Watermark Badge on bottom right */}
      <circle cx="33" cy="31" r="7" fill="#312E81" stroke="#FFFFFF" strokeWidth="1.5" />
      <text
        x="33"
        y="34"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        ©
      </text>
    </svg>
  )
}

// 12. CSV ⇄ JSON - Teal data grid to curly braces
export function CsvJsonIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#0D9488" />
      {/* Table grid on left */}
      <rect x="12" y="16" width="16" height="24" rx="2" fill="#FFFFFF" />
      <rect x="14" y="21" width="12" height="2" fill="#0D9488" />
      <rect x="14" y="26" width="12" height="2" fill="#0D9488" fillOpacity="0.4" />
      <rect x="14" y="31" width="12" height="2" fill="#0D9488" fillOpacity="0.4" />
      {/* JSON code brackets on right */}
      <rect x="28" y="16" width="16" height="24" rx="2" fill="#134E4A" />
      <text
        x="36"
        y="32"
        fill="#5EEAD4"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="monospace"
      >
        {'{ }'}
      </text>
    </svg>
  )
}

// 13. File Hash & Checksum - Deep Navy badge with fingerprint biometric scanner
export function HashChecksumIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#1E3A8A" />
      {/* Shield base */}
      <path
        d="M28 12L40 17V27C40 35 34.5 41 28 44C21.5 41 16 35 16 27V17L28 12Z"
        fill="#FFFFFF"
      />
      {/* Fingerprint ridges inside shield */}
      <path
        d="M28 20C25 20 23 22 23 25V28M28 24C26.5 24 25.5 25 25.5 26.5V29.5M28 28V36M30.5 26.5V33M33 25V30"
        stroke="#1E3A8A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 14. Base64 Encoder - Slate / Indigo badge with binary 0101
export function Base64Icon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#4338CA" />
      {/* Terminal chip */}
      <rect x="13" y="15" width="30" height="26" rx="4" fill="#1E1B4B" stroke="#6366F1" strokeWidth="1.5" />
      <text
        x="28"
        y="27"
        fill="#818CF8"
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="monospace"
      >
        0101
      </text>
      <text
        x="28"
        y="36"
        fill="#A5B4FC"
        fontSize="7"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="monospace"
      >
        BASE64
      </text>
    </svg>
  )
}

// 15. PDF to Word (Iconic Word Blue with W)
export function PdfToWordIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#2B579A" />
      <rect x="13" y="13" width="18" height="24" rx="2.5" fill="#E5322D" />
      <text x="22" y="27" fill="#FFFFFF" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        PDF
      </text>
      <rect x="25" y="19" width="18" height="24" rx="2.5" fill="#FFFFFF" />
      <text x="34" y="35" fill="#2B579A" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        W
      </text>
    </svg>
  )
}

// 16. PDF to Excel (Iconic Excel Green with X)
export function PdfToExcelIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#217346" />
      <rect x="13" y="13" width="18" height="24" rx="2.5" fill="#E5322D" />
      <text x="22" y="27" fill="#FFFFFF" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">
        PDF
      </text>
      <rect x="25" y="19" width="18" height="24" rx="2.5" fill="#FFFFFF" />
      <text x="34" y="35" fill="#217346" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        X
      </text>
    </svg>
  )
}

// 17. Organize PDF - Coral red badge with multi reorder pages
export function OrganizePdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#E11D48" />
      <rect x="12" y="13" width="13" height="17" rx="2" fill="#FFFFFF" />
      <rect x="31" y="13" width="13" height="17" rx="2" fill="#FFFFFF" fillOpacity="0.5" />
      <rect x="12" y="26" width="13" height="17" rx="2" fill="#FFFFFF" fillOpacity="0.5" />
      <rect x="31" y="26" width="13" height="17" rx="2" fill="#FFFFFF" />
      {/* Exchange arrow */}
      <circle cx="28" cy="28" r="6" fill="#9F1239" />
      <path
        d="M26 26L30 30M30 26L26 30"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 18. Protect / Lock PDF - Cyan / Blue badge with security padlock
export function ProtectPdfIcon({ className = '', size = 48 }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
    >
      <rect width="56" height="56" rx="14" fill="#0284C7" />
      {/* Base doc */}
      <rect x="16" y="12" width="24" height="32" rx="3" fill="#FFFFFF" />
      {/* Lock on doc */}
      <rect x="22" y="26" width="12" height="10" rx="2" fill="#0369A1" />
      <path
        d="M24 26V23C24 20.7909 25.7909 19 28 19C30.2091 19 32 20.7909 32 23V26"
        stroke="#0369A1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="28" cy="31" r="1.5" fill="#FFFFFF" />
    </svg>
  )
}
