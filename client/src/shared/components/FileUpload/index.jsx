import React, { useRef, useState, useCallback } from 'react';

export default function FileUpload({
  accept,
  onFileSelect,
  multiple = false,
  validate,
  label = 'Drag & drop files here, or click to browse',
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const processFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList);
      const valid = [];
      for (const f of arr) {
        if (validate) {
          const err = validate(f);
          if (err) {
            setError(err);
            return;
          }
        }
        valid.push(f);
      }
      setError(null);
      const updated = multiple ? [...files, ...valid] : valid;
      setFiles(updated);
      if (onFileSelect) onFileSelect(multiple ? updated : updated[0] || null);
    },
    [files, multiple, onFileSelect, validate]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    if (e.target.files.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (onFileSelect) onFileSelect(multiple ? updated : updated[0] || null);
  };

  const borderColor = isDragging ? 'var(--color-info)' : 'var(--color-rule-grey)';
  const bgColor = isDragging ? 'var(--dash-info-bg)' : 'transparent';

  // Check if label is a React element (JSX) or a string
  const isCustomLabel = React.isValidElement(label);

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: '12px',
          padding: isCustomLabel ? '48px' : '32px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: bgColor,
          transition: 'all 0.15s ease',
          color: 'var(--color-ink-navy)',
          fontSize: '0.9375rem',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {isCustomLabel ? (
          label
        ) : (
          <>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: '8px' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>{label}</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      {files.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--dash-surface-hover)',
                border: '1px solid var(--color-rule-grey)',
                marginBottom: '6px',
                fontSize: '0.875rem',
                color: 'var(--color-ink-black)',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                {f.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '0 4px',
                  flexShrink: 0,
                }}
              >
                &#x2715;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
