import React from 'react';
import { Colors } from '../../constants/Colors';

interface OfficePreviewProps {
  previewUrl: string;
  resourceType: 'pdf' | 'document' | 'slides';
  title: string;
  isLoading?: boolean;
  onError?: () => void;
}

export const OfficeOnlinePreview: React.FC<OfficePreviewProps> = ({ 
  previewUrl, 
  resourceType,
  title,
  isLoading = false,
  onError
}) => {
  const getIcon = () => {
    switch (resourceType) {
      case 'document':
        return '📘';
      case 'slides':
        return '📊';
      case 'pdf':
      default:
        return '📄';
    }
  };

  const getLabel = () => {
    switch (resourceType) {
      case 'document':
        return 'Word Document Preview';
      case 'slides':
        return 'PowerPoint Preview';
      case 'pdf':
      default:
        return 'PDF Preview';
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3">
        <label style={{ color: Colors.textSecondary }} className="block text-sm font-medium mb-2">
          {getIcon()} {getLabel()}
        </label>
        <div
          className="rounded border p-4 text-center"
          style={{
            borderColor: Colors.gray600,
            backgroundColor: Colors.textInputBg,
            color: Colors.textMuted,
            height: "500px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p className="text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <label style={{ color: Colors.textSecondary }} className="block text-sm font-medium mb-2">
        {getIcon()} {getLabel()}
      </label>
      <div
        className="rounded overflow-hidden border"
        style={{
          borderColor: Colors.gray600,
          height: "500px",
        }}
      >
        <iframe
          src={previewUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title={`${getLabel()} - ${title}`}
          allow="fullscreen"
          onError={onError}
        />
      </div>
      <div
        className="mt-2 px-2 py-1 rounded text-xs"
        style={{
          backgroundColor: Colors.gray800,
          color: Colors.textMuted,
        }}
      >
        💡 Tip: For pixel-perfect formatting after upload, document is displayed with Microsoft Office Online viewer
      </div>
    </div>
  );
};

export default OfficeOnlinePreview;
