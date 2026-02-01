import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Colors } from '../../constants/Colors';

interface LocalDocumentPreviewProps {
  fileName: string;
  fileSize?: number;
  resourceType: 'pdf' | 'document' | 'slides' | 'unknown';
  previewContent?: React.ReactNode;
  isProcessing?: boolean;
  errorMessage?: string;
}

/**
 * Component that shows a local document preview with a helpful prompt
 * to upload for pixel-perfect rendering using Office Online viewer
 */
export const LocalDocumentPreview: React.FC<LocalDocumentPreviewProps> = ({
  fileName,
  fileSize,
  resourceType,
  previewContent,
  isProcessing = false,
  errorMessage,
}) => {
  const getIcon = () => {
    switch (resourceType) {
      case 'document':
        return '📘';
      case 'slides':
        return '📊';
      case 'pdf':
        return '📄';
      default:
        return '📎';
    }
  };

  const getLabel = () => {
    switch (resourceType) {
      case 'document':
        return 'Word Document Preview';
      case 'slides':
        return 'PowerPoint Preview';
      case 'pdf':
        return 'PDF Preview';
      default:
        return 'Document Preview';
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-start gap-2 p-3 rounded mb-3" style={{
        backgroundColor: Colors.gray800,
        borderLeft: `3px solid ${Colors.accent}`,
      }}>
        <AlertCircle size={16} style={{ color: Colors.accent, marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '12px', color: Colors.textSecondary }}>
          <p className="font-medium">Local Preview</p>
          <p className="text-xs mt-1" style={{ color: Colors.textMuted }}>
            Click "Save Lesson" to upload and view with pixel-perfect Microsoft Office Online rendering
          </p>
        </div>
      </div>

      <label style={{ color: Colors.textSecondary }} className="block text-sm font-medium mb-2">
        {getIcon()} {getLabel()}
      </label>

      {isProcessing ? (
        <div
          className="rounded border p-4 text-center"
          style={{
            borderColor: Colors.gray600,
            backgroundColor: Colors.textInputBg,
            color: Colors.textMuted,
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p className="text-sm">Processing document...</p>
        </div>
      ) : errorMessage ? (
        <div
          className="rounded border p-4 text-center"
          style={{
            borderColor: Colors.gray600,
            backgroundColor: Colors.textInputBg,
            color: '#ff6b6b',
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p className="text-sm">{errorMessage}</p>
        </div>
      ) : previewContent ? (
        <div
          className="rounded border overflow-auto"
          style={{
            borderColor: Colors.gray600,
            backgroundColor: Colors.textInputBg,
            height: "300px",
          }}
        >
          {previewContent}
        </div>
      ) : (
        <div
          className="rounded border p-4 text-center"
          style={{
            borderColor: Colors.gray600,
            backgroundColor: Colors.textInputBg,
            color: Colors.textMuted,
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p className="text-sm">No preview available</p>
        </div>
      )}
    </div>
  );
};

export default LocalDocumentPreview;
