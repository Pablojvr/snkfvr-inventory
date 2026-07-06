import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const origin = request.headers.get('origin') || '*';
  
  // Clonar la respuesta por defecto
  const response = NextResponse.next();

  // Inyectar headers CORS
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  
  // Si es un preflight, retornar directamente con los headers
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200, 
      headers: response.headers 
    });
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
