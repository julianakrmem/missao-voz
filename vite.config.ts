import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// O microfone só funciona em HTTPS (ou localhost).
// `npm run celular` sobe o servidor na rede local com um certificado
// autoassinado, para testar direto no celular.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'celular' ? [basicSsl()] : [])],
}));
