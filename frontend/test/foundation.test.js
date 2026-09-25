import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessTypologyAssignment, isCentralAdministrator, roleName, ROLES } from '../src/config/roles.js';
import { ASSIGNMENT_STATE_COLUMN, ASSIGNMENT_STATES, assignmentStateOf, validateBulkAssignment } from '../src/modules/typology-assignment/assignment.service.js';

test('recognizes the authorized central role from the joined role', () => {
  const profile = { roles: { nombre: ROLES.CENTRAL } };
  assert.equal(roleName(profile), ROLES.CENTRAL);
  assert.equal(isCentralAdministrator(profile), true);
  assert.equal(isCentralAdministrator({ rol: ROLES.PROVINCIAL }), false);
});

test('recognizes MASTER_CENTRAL by its stable code and authorizes the typology route', () => {
  const profile = { roles: { codigo: 'MASTER_CENTRAL', nombre: 'Nombre descriptivo variable' } };
  assert.equal(isCentralAdministrator(profile), true);
  assert.equal(canAccessTypologyAssignment(profile), true);
});

test('uses estado_asignacion as the matrix read contract', () => {
  assert.equal(ASSIGNMENT_STATE_COLUMN, 'estado_asignacion');
  assert.equal(assignmentStateOf({ estado_asignacion: 'OPCIONAL', estado: 'REQUERIDA' }), 'OPCIONAL');
});

test('keeps SIN_CONFIGURAR as a read state, not an upsert state', () => {
  assert.deepEqual(ASSIGNMENT_STATES, ['SIN_CONFIGURAR', 'REQUERIDA', 'OPCIONAL', 'NO_PERMITIDA']);
  assert.throws(() => validateBulkAssignment({
    nivel: 'II', tipologia: 'Hospital', catalogoIds: ['id'], estado: 'SIN_CONFIGURAR',
    fuenteRegla: 'Normativa', justificacion: 'Prueba', vigenciaDesde: '2026-01-01', vigenciaHasta: '',
  }), /Seleccione un estado configurable/);
});

test('accepts every configurable assignment state', () => {
  for (const estado of ['REQUERIDA', 'OPCIONAL', 'NO_PERMITIDA']) {
    assert.doesNotThrow(() => validateBulkAssignment({
      nivel: 'II', tipologia: 'Hospital', catalogoIds: ['id-1'], estado,
      fuenteRegla: 'Normativa MSP', justificacion: 'Aplicación institucional',
      vigenciaDesde: '2026-01-01', vigenciaHasta: '2026-12-31',
    }));
  }
});
