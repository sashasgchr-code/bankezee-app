import { Star } from 'lucide-react';
import { useState } from 'react';

const StarRating = ({ stars = 0, score = 0, size = 'md', showScore = true, editable = false, onRate }) => {
  const [hovered, setHovered] = useState(0);

  const sizeMap = {
    sm: { star: 'w-3.5 h-3.5', text: 'text-xs', gap: 'gap-0.5' },
    md: { star: 'w-5 h-5', text: 'text-sm', gap: 'gap-0.5' },
    lg: { star: 'w-6 h-6', text: 'text-base', gap: 'gap-1' },
  };
  const s = sizeMap[size] || sizeMap.md;

  const handleClick = (rating) => {
    if (editable && onRate) onRate(rating);
  };

  return (
    <div className={`flex items-center ${s.gap}`} data-testid="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${s.star} transition-colors ${
            i <= (hovered || stars) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
          } ${editable ? 'cursor-pointer hover:scale-110' : ''}`}
          onMouseEnter={() => editable && setHovered(i)}
          onMouseLeave={() => editable && setHovered(0)}
          onClick={() => handleClick(i)}
        />
      ))}
      {showScore && <span className={`${s.text} text-slate-500 ml-1`}>{score}/100</span>}
    </div>
  );
};

export default StarRating;
