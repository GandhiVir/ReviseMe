type Mood = "feisty" | "encouraging";

function FeistyCat({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 40 L26 12 L44 34 Z" fill="#f97316" />
      <path d="M82 40 L74 12 L56 34 Z" fill="#f97316" />
      <path d="M20 22 L26 34 L32 24 Z" fill="#fed7aa" />
      <path d="M80 22 L74 34 L68 24 Z" fill="#fed7aa" />
      <path d="M50 20 C28 20 16 36 16 56 C16 76 30 90 50 90 C70 90 84 76 84 56 C84 36 72 20 50 20 Z" fill="#f97316" />
      <path d="M32 46 Q37 40 44 44" stroke="#7c2d12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M68 46 Q63 38 55 43" stroke="#7c2d12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M28 58 Q37 50 46 57 Q37 60 28 58 Z" fill="#2b1608" />
      <path d="M72 58 Q63 50 54 57 Q63 60 72 58 Z" fill="#2b1608" />
      <circle cx="39" cy="57.5" r="3.2" fill="#ffffff" />
      <circle cx="61" cy="57.5" r="3.2" fill="#ffffff" />
      <path d="M6 56 Q20 50 30 58" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M6 64 Q20 62 30 63" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M94 56 Q80 50 70 58" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M94 64 Q80 62 70 63" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M50 62 L46 68 L54 68 Z" fill="#7c2d12" />
      <path d="M50 68 Q42 76 34 71 Q38 78 32 78" stroke="#3b1a06" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M40 73 L37 79" stroke="#3b1a06" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function EncouragingDog({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14 34 C4 34 -2 48 4 60 C8 68 18 70 24 64 L28 40 Z" fill="#a16207" />
      <path d="M86 34 C96 34 102 48 96 60 C92 68 82 70 76 64 L72 40 Z" fill="#a16207" />
      <path d="M17 40 C11 42 8 50 12 58 C15 62 20 62 22 58 L23 44 Z" fill="#fde68a" />
      <path d="M83 40 C89 42 92 50 88 58 C85 62 80 62 78 58 L77 44 Z" fill="#fde68a" />
      <circle cx="50" cy="56" r="34" fill="#eab308" />
      <path d="M50 46 C36 46 28 56 30 70 C40 64 60 64 70 70 C72 56 64 46 50 46 Z" fill="#fef9c3" />
      <circle cx="38" cy="54" r="6.5" fill="#3b2412" />
      <circle cx="62" cy="54" r="6.5" fill="#3b2412" />
      <circle cx="36" cy="51.5" r="2" fill="#ffffff" />
      <circle cx="60" cy="51.5" r="2" fill="#ffffff" />
      <ellipse cx="50" cy="62" rx="5" ry="4" fill="#3b2412" />
      <path d="M50 66 Q45 73 38 70" stroke="#3b2412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M50 66 Q55 73 62 70" stroke="#3b2412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M38 70 Q50 79 62 70" stroke="#3b2412" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="27" cy="64" rx="5.5" ry="4" fill="#fb923c" fillOpacity="0.5" />
      <ellipse cx="73" cy="64" rx="5.5" ry="4" fill="#fb923c" fillOpacity="0.5" />
      <path d="M22 36 Q18 26 26 22" stroke="#a16207" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M78 36 Q82 26 74 22" stroke="#a16207" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Mascot({ mood = "feisty", className = "h-10 w-10" }: { mood?: Mood; className?: string }) {
  return mood === "encouraging" ? <EncouragingDog className={className} /> : <FeistyCat className={className} />;
}
