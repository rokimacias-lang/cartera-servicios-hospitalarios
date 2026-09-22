import test from 'node:test';
import assert from 'node:assert/strict';
import { isCentralAdministrator, roleName, ROLES } from '../src/config/roles.js';
import { ASSIGNMENT_STATES, validateBulkAssignment } from '../src/modules/typology-assignment/assignment.service.js';

test('recognizes the authorized central role from the joined role', () => {
  const profile = { roles: { nombre: ROLES.CENTRAL } };
  assert.equal(roleName(profile), ROLES.CENTRAL);
  assert.equal(isCentralAdministrator(profile), true);
  assert.equal(isCentralAdministrator({ rol: ROLES.PROVINCIAL }), false);
});

test('keeps SIN_CONFIGURAR as a read state, not an upsert state', () => {
  assert.deepEqual(ASSIGNMENT_STATES, ['SIN_CONFIGURAR', 'REQUERIDA', 'OPCIONAL', 'NO_PERMITIDA']);
  assert.throws(() => validateBulkAssignment({
    nivel: 'II', tipologia: 'Hospital', catalogoIds: ['id'], estado: 'SIN_CONFIGURAR',
    fuenteRegla: 'Normativa', justificacion: 'Prueba', vigenciaDesde: '2026-01-01', vigenciaHasta: '',
  }), /Seleccione un estado configurable/);
});

test('validates a complete bulk assignment command', () => {
  assert.doesNotThrow(() => validateBulkAssignment({
    nivel: 'II', tipologia: 'Hospital', catalogoIds: ['id-1'], estado: 'REQUERIDA',
    fuenteRegla: 'Normativa MSP', justificacion: 'Aplicación institucional',
    vigenciaDesde: '2026-01-01', vigenciaHasta: '2026-12-31',
  }));
});
