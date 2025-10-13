import { useState, useCallback } from 'react';
import { showOpenDialog } from '../api';
import { handleError } from '../utils/errorHandler';
import { deriveAltFromPath } from '../utils/image';
import type { ImageProps } from '../components/ImagePropsModal';
import type { ImagePlusChoice } from '../components/ImagePlusModal';
import { logger } from '../utils/logger';

// Create scoped logger
const imageLogger = logger.createScoped('ImageHandlers');

interface UseImageHandlersProps {
  preferences: {
    default_image_width: string;
    default_image_alignment: string;
  };
  importImage: (base64: string, filename?: string) => Promise<string>;
  importImageFromPath: (path: string) => Promise<string>;
  generateImageMarkdown: (path: string, width: string, alignment: string, alt: string) => string;
  showSuccess: (message: string) => void;
  insertSnippet: (snippet: string) => void;
}

export const useImageHandlers = ({
  preferences,
  importImage,
  importImageFromPath,
  generateImageMarkdown,
  showSuccess,
  insertSnippet,
}: UseImageHandlersProps) => {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalResolveRef, setImageModalResolveRef] = useState<((props: ImageProps | null) => void) | null>(null);
  const [imageInitial, setImageInitial] = useState<ImageProps>({ width: '60%', alignment: 'center', alt: '' });
  const [imagePlusOpen, setImagePlusOpen] = useState(false);
  const [imagePlusPath, setImagePlusPath] = useState('assets/');

  // Helper: open image modal and resolve with chosen values or null on cancel
  const promptImageProps = useCallback((initial: ImageProps): Promise<ImageProps | null> => {
    return new Promise((resolve) => {
      setImageModalResolveRef(() => resolve);
      setImageModalOpen(true);
      setImageInitial(initial);
    });
  }, []);

  // Handle image insertion from file picker
  const handleImageInsert = useCallback(async () => {
    try {
      // Open file picker for images
      const selectedFile = await showOpenDialog([{
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
      }]);

      if (!selectedFile) return; // User cancelled

      // Copy the selected file into the app's assets directory via backend
      try {
        const assetPath = await importImageFromPath(selectedFile);
        // Ask for width/alignment before inserting
        const initial: ImageProps = {
          width: preferences.default_image_width,
          alignment: preferences.default_image_alignment as ImageProps['alignment'],
          alt: deriveAltFromPath(assetPath)
        };
        const chosen = await promptImageProps(initial);
        if (!chosen) return; // cancelled
        const imageMarkdown = generateImageMarkdown(
          assetPath,
          chosen.width,
          chosen.alignment,
          chosen.alt
        );
        insertSnippet(imageMarkdown);
        // Seed Image+ modal path for convenience
        setImagePlusPath(assetPath);
        imageLogger.info('Inserted image asset path:', assetPath);
        showSuccess(`Inserted image: ${assetPath}`);
      } catch (err) {
        handleError(err, { operation: 'import image file', component: 'Editor' });
      }
    } catch (err) {
      handleError(err, { operation: 'open image file picker', component: 'Editor' });
    }
  }, [preferences, importImageFromPath, promptImageProps, generateImageMarkdown, insertSnippet, showSuccess]);

  // Handle paste events for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') === 0) {
        e.preventDefault();

        const blob = item.getAsFile();
        if (!blob) continue;

        try {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (!event.target?.result) return;

            const base64data = event.target.result.toString();
            const assetPath = await importImage(base64data);

            // Insert image markdown with default preferences
            const imageMarkdown = generateImageMarkdown(
              assetPath,
              preferences.default_image_width,
              preferences.default_image_alignment,
              'Pasted image'
            );

            insertSnippet(imageMarkdown);
          };

          reader.readAsDataURL(blob);
        } catch (err) {
          handleError(err, { operation: 'process pasted image', component: 'Editor' });
        }
      }
    }
  }, [preferences, importImage, generateImageMarkdown, insertSnippet]);

  // Handle drop events for images
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      if (file.type.startsWith('image/')) {
        try {
          // Convert file to base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (!event.target?.result) return;

            const base64data = event.target.result.toString();
            const assetPath = await importImage(base64data, file.name);

            // Prompt for image properties before inserting
            const initial: ImageProps = {
              width: preferences.default_image_width,
              alignment: preferences.default_image_alignment as ImageProps['alignment'],
              alt: deriveAltFromPath(file.name)
            };
            const chosen = await promptImageProps(initial);
            if (!chosen) return; // User cancelled

            const imageMarkdown = generateImageMarkdown(
              assetPath,
              chosen.width,
              chosen.alignment,
              chosen.alt
            );

            insertSnippet(imageMarkdown);
            showSuccess(`Inserted image: ${assetPath}`);
          };

          reader.readAsDataURL(file);
        } catch (err) {
          handleError(err, { operation: 'process dropped image', component: 'Editor' });
        }
      }
    }
  }, [preferences, importImage, generateImageMarkdown, insertSnippet, promptImageProps, showSuccess]);

  const handleImagePlusChoose = useCallback((choice: ImagePlusChoice) => {
    setImagePlusOpen(false);
    // Return the choice for the component to handle insertion
    return choice;
  }, []);

  return {
    imageModalOpen,
    setImageModalOpen,
    imageModalResolveRef,
    imageInitial,
    imagePlusOpen,
    setImagePlusOpen,
    imagePlusPath,
    setImagePlusPath,
    promptImageProps,
    handleImageInsert,
    handlePaste,
    handleDrop,
    handleImagePlusChoose,
  };
};