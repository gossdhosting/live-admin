import React, { useState, createContext, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const AlertDialogContext = createContext(null);

export function AlertDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const showAlert = ({ title, message, type = 'info' }) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        title,
        message,
        alertType: type,
        onClose: () => {
          setDialog(null);
          resolve();
        },
      });
    });
  };

  const showConfirm = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default' }) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        },
      });
    });
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAlertClass = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <AlertDialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {dialog && (
        <Dialog open={true} onOpenChange={() => dialog.type === 'alert' ? dialog.onClose() : dialog.onCancel()}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {dialog.type === 'alert' && getAlertIcon(dialog.alertType)}
                {dialog.title}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              {dialog.type === 'alert' ? (
                <Alert className={getAlertClass(dialog.alertType)}>
                  <AlertDescription className="text-sm">
                    {dialog.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <DialogDescription className="text-sm text-gray-700">
                  {dialog.message}
                </DialogDescription>
              )}
            </div>

            <DialogFooter>
              {dialog.type === 'alert' ? (
                <Button onClick={dialog.onClose}>OK</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={dialog.onCancel}>
                    {dialog.cancelText}
                  </Button>
                  <Button
                    variant={dialog.variant}
                    onClick={dialog.onConfirm}
                  >
                    {dialog.confirmText}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AlertDialogContext.Provider>
  );
}

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('useAlertDialog must be used within AlertDialogProvider');
  }
  return context;
}
