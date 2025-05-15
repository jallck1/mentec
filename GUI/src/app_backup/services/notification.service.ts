import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'right',
    verticalPosition: 'top'
  };

  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string, action: string = 'Cerrar', config: MatSnackBarConfig = {}) {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      ...config,
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string, action: string = 'Cerrar', config: MatSnackBarConfig = {}) {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      ...config,
      panelClass: ['error-snackbar']
    });
  }

  showInfo(message: string, action: string = 'Cerrar', config: MatSnackBarConfig = {}) {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      ...config,
      panelClass: ['info-snackbar']
    });
  }

  showWarning(message: string, action: string = 'Cerrar', config: MatSnackBarConfig = {}) {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      ...config,
      panelClass: ['warning-snackbar']
    });
  }
}
