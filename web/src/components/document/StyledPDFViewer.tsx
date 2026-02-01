import React from "react";
import AutomatedPDFViewer from "./AutomatedPDFViewer";
import { Colors } from "@/constants/Colors";

interface StyledPDFViewerProps {
  pdfUrl: string;
  title: string;
}

/**
 * Wrapper component for AutomatedPDFViewer with CenterContent-specific styling
 */
const StyledPDFViewer: React.FC<StyledPDFViewerProps> = ({ pdfUrl, title }) => {
  return (
    <div
      className="rounded overflow-hidden border"
      style={{
        borderColor: Colors.gray600,
        height: "500px",
      }}
    >
      <AutomatedPDFViewer pdfUrl={pdfUrl} title={title} />
    </div>
  );
};

export default StyledPDFViewer;