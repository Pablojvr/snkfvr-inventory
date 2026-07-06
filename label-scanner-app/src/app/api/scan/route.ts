import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Permitir hasta 60 segundos en Vercel Serverless (Plan Hobby)
export const maxDuration = 60;

// Instanciar el cliente de Google Generative AI (requiere variable de entorno GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta la API Key de Gemini en el servidor.' }, { status: 500 });
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No se proporcionó ninguna imagen.' }, { status: 400 });
    }

    // El modelo gemini-2.5-flash es excelente para tareas multimodales (visión + texto) rápidas
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    const prompt = `
      Eres un experto identificador de calzado y extractor de datos de etiquetas (viñetas).
      Analiza la imagen adjunta de la etiqueta de un zapato y extrae exactamente los siguientes datos en formato JSON:
      - "modelo": Primero identifica el código de producto / SKU / ART impreso en la etiqueta (ej. DD1391-100, FZ5897, etc.). Luego, busca o usa tu conocimiento para deducir el NOMBRE COMERCIAL COMPLETO del zapato correspondiente a ese código (ej. "Nike Dunk Low Retro White Black"). DEBES devolver el nombre del zapato, NO solo el código. Si no encuentras el nombre exacto, pon la marca y el código.
      - "talla": La talla principal (preferiblemente US o EU). Devuelve el valor con la unidad, ej. "US 9.5" o "EU 43".
      - "cm": La longitud en centímetros (frecuentemente etiquetada como CM, CHN o JP). Solo el número, ej. "27.5".

      No devuelvas ningún texto extra, ni markdown, SOLO EL JSON PURO válido con esas 3 claves.
    `;

    // Gemini espera la imagen en un formato específico
    const imagePart = {
      inlineData: {
        data: imageBase64.split(',')[1] || imageBase64, // Quitar el prefijo data:image/jpeg;base64, si existe
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Limpiar la respuesta por si el modelo devuelve markdown ```json ... ```
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('\`\`\`json')) {
      cleanJson = cleanJson.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (cleanJson.startsWith('\`\`\`')) {
        cleanJson = cleanJson.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error al procesar la imagen con Gemini:', error);
    return NextResponse.json({ error: 'Hubo un error al procesar la imagen.', details: error.message }, { status: 500 });
  }
}
