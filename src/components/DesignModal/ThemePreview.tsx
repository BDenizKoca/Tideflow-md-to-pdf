import React, { type CSSProperties } from 'react';

type ThemePreviewLayout = 'dense' | 'regular' | 'spacious';

interface ThemePreviewProps {
  pageColor: string;
  fontColor: string;
  accentColor: string;
  twoColumn?: boolean;
  layout: ThemePreviewLayout;
  isDarkPage: boolean;
  imageWidth: number;
  headingScale: number;
}

const layoutWidths: Record<ThemePreviewLayout, { single: number[]; columns: number[][] }> = {
  dense: {
    single: [92, 82, 88, 76, 84, 70, 78],
    columns: [
      [86, 74, 82, 70],
      [80, 68, 76, 64],
    ],
  },
  regular: {
    single: [90, 76, 84, 68, 74],
    columns: [
      [82, 70, 78],
      [76, 64, 72],
    ],
  },
  spacious: {
    single: [82, 66, 74, 58],
    columns: [
      [74, 60, 68],
      [68, 54, 62],
    ],
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ThemePreview: React.FC<ThemePreviewProps> = ({
  pageColor,
  fontColor,
  accentColor,
  twoColumn = false,
  layout,
  isDarkPage,
  imageWidth,
  headingScale,
}) => {
  const previewStyle: CSSProperties = {
    '--preview-page-color': pageColor,
    '--preview-font-color': fontColor,
    '--preview-accent-color': accentColor,
  } as CSSProperties;

  const classes = ['theme-preview', 'custom-preview', `layout-${layout}`];
  if (isDarkPage) classes.push('is-dark-page');
  if (twoColumn) classes.push('two-column');

  const headingHeight = clamp(Math.round(11 + (headingScale - 1) * 6), 10, 18);
  const figuredWidth = clamp(Math.round(imageWidth), 36, twoColumn ? 85 : 92);

  const widths = layoutWidths[layout];
  const singleColumnWidths = widths.single;
  const columnWidths = widths.columns;

  return (
    <div className={classes.join(' ')} style={previewStyle}>
      <div className="theme-preview-page">
        <div className="theme-preview-header" style={{ height: `${headingHeight}px` }} />
        <div className="theme-preview-body">
          {twoColumn ? (
            <div className="theme-preview-columns">
              {columnWidths.map((colWidths, columnIndex) => (
                <div className="theme-preview-column" key={`column-${columnIndex}`}>
                  {colWidths.map((width, idx) => {
                    const lineClasses = ['theme-preview-line'];
                    if (columnIndex === 0 && idx === 0) lineClasses.push('accent');
                    if (idx % 2 === 1) lineClasses.push('muted');
                    if (width <= 68) lineClasses.push('short');
                    return (
                      <div
                        key={`column-${columnIndex}-line-${idx}`}
                        className={lineClasses.join(' ')}
                        style={{ width: `${width}%` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="theme-preview-lines">
              {singleColumnWidths.map((width, idx) => {
                const lineClasses = ['theme-preview-line'];
                if (idx === 0) lineClasses.push('accent');
                if (idx % 2 === 1) lineClasses.push('muted');
                if (width <= 70) lineClasses.push('short');
                return (
                  <div
                    key={`line-${idx}`}
                    className={lineClasses.join(' ')}
                    style={{ width: `${width}%` }}
                  />
                );
              })}
            </div>
          )}
          <div
            className="theme-preview-figure"
            style={{ width: `${figuredWidth}%` }}
          />
          <div className="theme-preview-footer">
            <div className="theme-preview-meta" />
            <div className="theme-preview-meta short" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;
