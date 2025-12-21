import { useState, useEffect } from 'react';
import './ScrollToTop.css';

interface ScrollToTopProps {
  threshold?: number;
}

export function ScrollToTop({ threshold = 300 }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('.main') as HTMLElement;

    if (!scrollContainer) {
      return;
    }

    const toggleVisibility = () => {
      const scrolled = scrollContainer.scrollTop;
      if (scrolled > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    toggleVisibility();
    scrollContainer.addEventListener('scroll', toggleVisibility);

    return () => {
      scrollContainer.removeEventListener('scroll', toggleVisibility);
    };
  }, [threshold]);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.main') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <button
      className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
      onClick={scrollToTop}
      aria-label="回到顶部"
      title="回到顶部"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 19V5M12 5L5 12M12 5L19 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
