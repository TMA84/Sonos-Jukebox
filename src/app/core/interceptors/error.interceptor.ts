import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastController = inject(ToastController);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        errorMessage = error.error?.message || error.message;

        // Handle specific status codes
        if (error.status === 401) {
          router.navigate(['/login']);
        } else if (error.status === 403) {
          errorMessage = 'Access denied';
        } else if (error.status === 404) {
          errorMessage = 'Resource not found';
        } else if (error.status === 500) {
          errorMessage = 'Server error';
        }
      }

      // Show toast notification
      toastController
        .create({
          message: errorMessage,
          duration: 3000,
          color: 'danger',
          position: 'top',
        })
        .then(toast => toast.present());

      return throwError(() => new Error(errorMessage));
    })
  );
};
