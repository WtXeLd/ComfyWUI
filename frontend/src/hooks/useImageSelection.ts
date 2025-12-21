import { useState, useEffect, useCallback } from 'react';
import type { ImageMetadata } from '../types/image';

interface UseImageSelectionOptions {
  images: ImageMetadata[];
  currentTab: string;
}

interface UseImageSelectionReturn {
  selectedIds: Set<string>;
  lastClickedIndex: number | null;
  toggleSelection: (imageId: string, event: React.MouseEvent) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

/**
 * Custom hook for managing image selection
 * Supports:
 * - Single click toggle
 * - Shift+click range selection
 * - Ctrl/Cmd+A select all (keyboard shortcut)
 *
 * @param options - Configuration with images array and current tab
 * @returns Selection state and control functions
 */
export function useImageSelection(options: UseImageSelectionOptions): UseImageSelectionReturn {
  const { images, currentTab } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Toggle selection for a single image or range (with Shift)
  const toggleSelection = useCallback((imageId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const clickedIndex = images.findIndex(img => img.id === imageId);

    // Shift + Click: Range selection
    if (event.shiftKey) {
      setLastClickedIndex(prevLastIndex => {
        if (prevLastIndex !== null) {
          const start = Math.min(prevLastIndex, clickedIndex);
          const end = Math.max(prevLastIndex, clickedIndex);

          setSelectedIds(prev => {
            const newSet = new Set(prev);
            for (let i = start; i <= end; i++) {
              newSet.add(images[i].id);
            }
            return newSet;
          });
        }
        return clickedIndex;
      });
    }
    // Normal click: Toggle single selection
    else {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(imageId)) {
          newSet.delete(imageId);
        } else {
          newSet.add(imageId);
        }
        return newSet;
      });
      setLastClickedIndex(clickedIndex);
    }
  }, [images]);

  // Select all images
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map(img => img.id)));
  }, [images]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+A to select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when on generation tab and there are images
      if (currentTab !== 'generation' || images.length === 0) return;

      // Check if focus is on a text input element (not checkbox/radio/etc)
      const target = e.target as HTMLElement;

      // Helper function to check if element is a text input
      const isTextInputFocused = (): boolean => {
        if (target.tagName === 'TEXTAREA') return true;
        if (target.tagName === 'SELECT') return true;
        if (target.isContentEditable) return true;

        if (target.tagName === 'INPUT') {
          const inputType = (target as HTMLInputElement).type.toLowerCase();
          // Only allow Ctrl+A for text-based input types
          return ['text', 'password', 'email', 'search', 'tel', 'url', 'number'].includes(inputType);
        }

        return false;
      };

      // If a text input is focused, allow default Ctrl+A behavior
      if (isTextInputFocused()) return;

      // Ctrl+A or Cmd+A: Select all images
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) {
        // Prevent default text selection
        e.preventDefault();
        e.stopPropagation();

        // Select all images
        selectAll();
      }
    };

    // Use capture phase on document to intercept as early as possible
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [currentTab, images.length, selectAll]);

  return {
    selectedIds,
    lastClickedIndex,
    toggleSelection,
    selectAll,
    clearSelection,
  };
}
