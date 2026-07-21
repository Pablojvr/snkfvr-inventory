import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Ignorar urls que no son de nuestra API (si hubiera alguna, por ahora todo va a apiUrl)
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  if (isApiRequest && environment.apiKey) {
    const cloned = req.clone({
      setHeaders: {
        'X-Api-Key': environment.apiKey
      }
    });
    return next(cloned);
  }

  return next(req);
};
