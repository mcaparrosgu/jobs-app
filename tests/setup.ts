import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpia el DOM entre pruebas de componentes: sin esto, cada `render()`
// de un archivo de pruebas se acumula sobre el anterior y aparecen varios
// elementos iguales donde solo debería haber uno.
afterEach(() => {
  cleanup();
});
