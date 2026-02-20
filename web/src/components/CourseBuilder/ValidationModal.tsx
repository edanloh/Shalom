import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Colors } from "../../constants/Colors";

interface ValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "OK",
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ backgroundColor: Colors.gray800, borderColor: Colors.gray600 }}>
        <DialogHeader>
          <DialogTitle style={{ color: Colors.textPrimary }}>
            {title}
          </DialogTitle>
          <DialogDescription style={{ color: Colors.textSecondary }}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            style={{ backgroundColor: Colors.accent, color: Colors.textPrimary }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
