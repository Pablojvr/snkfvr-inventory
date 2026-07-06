const fs = require('fs');

async function testScan() {
  const imagePath = 'C:\\Users\\Javier\\Downloads\\6_cda2ca76-827f-40be-aabb-d6d69375c38a.webp';
  
  if (!fs.existsSync(imagePath)) {
    console.error('La imagen no existe en la ruta:', imagePath);
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = 'data:image/webp;base64,' + imageBuffer.toString('base64');

  console.log('Enviando imagen a la API de Vercel...');
  const aiUrl = 'https://label-scanner-app-pied.vercel.app/api/scan';
  
  try {
    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageBase64: base64Image })
    });

    const data = await response.json();
    console.log('Respuesta de la IA:', data);
    
    // Ahora simulamos el registro en la base de datos
    console.log('\n--- Simulando Registro de Producto ---');
    const nuevoProducto = {
      descripcion: data.modelo || 'Producto Generico',
      fechaCompra: new Date().toISOString(),
      estado: 'Disponible',
      activo: true,
      talla_extraida: data.talla,
      cm_extraido: data.cm
    };
    
    console.log('Producto a registrar:', nuevoProducto);
    console.log('¡Test exitoso!');
  } catch (error) {
    console.error('Error durante el test:', error);
  }
}

testScan();
