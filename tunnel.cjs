const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    const backendTunnel = await localtunnel({ port: 5000 });
    console.log('🔗 Backend Público:', backendTunnel.url);

    // Update .env.local with VITE_API_URL so frontend uses the new backend URL
    fs.writeFileSync('.env.local', `VITE_API_URL=${backendTunnel.url}/api\n`);
    console.log('✅ Arquivo .env.local atualizado com a nova URL da API.');

    const frontendTunnel = await localtunnel({ port: 5173 });
    console.log('🔗 Frontend Público:', frontendTunnel.url);

    backendTunnel.on('close', () => console.log('Backend tunnel closed'));
    frontendTunnel.on('close', () => console.log('Frontend tunnel closed'));
    
    console.log('\n======================================================');
    console.log('🎉 TÚNEIS ATIVOS!');
    console.log('-> Para acessar o aplicativo de qualquer lugar, use o link Frontend Público acima.');
    console.log('-> IMPORTANTE: Como as URLs mudam a cada execução, você deve REINICIAR O FRONTEND (parar e rodar "npm run dev" novamente) para que ele reconheça o novo link do Backend no .env.local.');
    console.log('======================================================\n');

  } catch(e) {
    console.error('Erro ao iniciar túneis:', e);
  }
})();
