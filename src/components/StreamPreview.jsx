import React from 'react';

/**
 * StreamPreview - A unified preview component showing both title overlay and watermark positioning
 * @param {Object} titleSettings - Title overlay settings (position, bg_color, opacity, text_color, font_size, box_padding)
 * @param {Object} watermarkSettings - Watermark settings (position, opacity, scale, path)
 * @param {string} sampleTitle - Sample text to show in title overlay
 */
function StreamPreview({ titleSettings = {}, watermarkSettings = {}, sampleTitle = "Example News Title Here" }) {
  // Parse title position
  const getTitleAlignment = (position) => {
    const pos = position || 'bottom-left';
    return {
      alignItems: pos.startsWith('top') ? 'flex-start' : pos.startsWith('bottom') ? 'flex-end' : 'center',
      justifyContent: pos.includes('center') ? 'center' : pos.includes('right') ? 'flex-end' : 'flex-start'
    };
  };

  // Parse watermark position
  const getWatermarkPosition = (position) => {
    const pos = position || 'top-right';
    const styles = { position: 'absolute' };

    if (pos.includes('top')) styles.top = '20px';
    else if (pos.includes('bottom')) styles.bottom = '20px';
    else styles.top = '50%';

    if (pos.includes('left')) styles.left = '20px';
    else if (pos.includes('right')) styles.right = '20px';
    else styles.left = '50%';

    if (pos === 'center') {
      styles.transform = 'translate(-50%, -50%)';
    } else if (pos.includes('center') && !pos.includes('left') && !pos.includes('right')) {
      styles.transform = 'translateX(-50%)';
    } else if (pos.includes('center') && !pos.includes('top') && !pos.includes('bottom')) {
      styles.transform = 'translateY(-50%)';
    }

    return styles;
  };

  const titleAlignment = getTitleAlignment(titleSettings.title_position);
  const watermarkPosition = getWatermarkPosition(watermarkSettings.watermark_position);

  return (
    <div className="space-y-4">
      <div
        className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg overflow-hidden shadow-2xl border-2 border-slate-600"
        style={{
          minHeight: '300px',
          aspectRatio: '16/9',
          maxWidth: '100%'
        }}
      >
        {/* Simulated video background with grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Simulated "LIVE" indicator */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg z-10">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE PREVIEW
        </div>

        {/* Watermark - Scaled accurately to match FFmpeg behavior */}
        {watermarkSettings.watermark_path && (
          <div
            style={{
              ...watermarkPosition,
              opacity: watermarkSettings.watermark_opacity || 1.0,
              zIndex: 20,
              maxWidth: '90%', // Prevent overflow
              maxHeight: '90%'
            }}
          >
            <img
              src={`${(import.meta.env.VITE_API_URL || '').replace('/api', '')}/uploads/watermarks/users/${watermarkSettings.watermark_path.split('/').pop()}`}
              alt="Watermark"
              className="rounded shadow-lg"
              style={{
                // FFmpeg scales watermark by: scale=iw*scale:ih*scale
                // So we apply scale directly to natural image dimensions
                // Use CSS transform to scale from natural size
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${watermarkSettings.watermark_scale || 1.0})`,
                transformOrigin: watermarkPosition.top ? (watermarkPosition.left ? 'top left' : watermarkPosition.right ? 'top right' : 'top center') :
                                 watermarkPosition.bottom ? (watermarkPosition.left ? 'bottom left' : watermarkPosition.right ? 'bottom right' : 'bottom center') :
                                 'center'
              }}
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              className="bg-blue-500 text-white font-bold items-center justify-center rounded shadow-lg hidden"
              style={{
                width: '150px',
                height: '150px',
                fontSize: '16px',
                transform: `scale(${watermarkSettings.watermark_scale || 1.0})`,
                transformOrigin: watermarkPosition.top ? (watermarkPosition.left ? 'top left' : watermarkPosition.right ? 'top right' : 'top center') :
                                 watermarkPosition.bottom ? (watermarkPosition.left ? 'bottom left' : watermarkPosition.right ? 'bottom right' : 'bottom center') :
                                 'center'
              }}
            >
              LOGO
            </div>
          </div>
        )}

        {/* Title Overlay Container */}
        <div
          className="absolute inset-0 p-8 flex"
          style={{
            alignItems: titleAlignment.alignItems,
            justifyContent: titleAlignment.justifyContent,
            zIndex: 10
          }}
        >
          {sampleTitle && (
            <div
              style={{
                backgroundColor: titleSettings.title_bg_color || '#000000',
                opacity: (titleSettings.title_opacity || 80) / 100,
                padding: `${titleSettings.title_box_padding || 5}px ${(titleSettings.title_box_padding || 5) * 1.5}px`,
                borderRadius: '4px',
                color: titleSettings.title_text_color || '#FFFFFF',
                fontSize: `${titleSettings.title_font_size || 16}px`,
                fontWeight: 'bold',
                maxWidth: '70%',
                wordWrap: 'break-word',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              {sampleTitle}
            </div>
          )}
        </div>

        {/* Resolution indicator */}
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">
          1280×720
        </div>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="font-semibold text-blue-900 mb-1">Preview Information:</p>
        <ul className="space-y-1 text-blue-800">
          {titleSettings.title_position && (
            <li>• Title: {titleSettings.title_position.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} position, {titleSettings.title_font_size || 16}px font, {titleSettings.title_opacity || 80}% opacity</li>
          )}
          {watermarkSettings.watermark_path && (
            <li>• Watermark: {watermarkSettings.watermark_position?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Top Right'} position, {Math.round((watermarkSettings.watermark_scale || 1.0) * 100)}% size, {Math.round((watermarkSettings.watermark_opacity || 1.0) * 100)}% opacity</li>
          )}
          {!titleSettings.title_position && !watermarkSettings.watermark_path && (
            <li>• Configure title overlay and watermark settings to see them in the preview</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default StreamPreview;
