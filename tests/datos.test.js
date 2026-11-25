// Períodos de cobro, ajustes y copias de respaldo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodoDe, rango, cobroDe, nombrePeriodo } from '../js/periodos.js';
import { ajustesEfectivos, migrarAjustes, AJ_VER } from '../js/ajustes.js';
import { normalize, mergeStates } from '../js/datos.js';
import { ajustes } from './ayuda.js';

test('por defecto se cobra por mes', () => {
  const aj = ajustes();
  assert.equal(aj.periodo, 'mensual');
  assert.equal(periodoDe('2026-11-20', aj), '2026-11');
  assert.deepEqual(rango('2026-11'), ['2026-11-01', '2026-11-30']);
  assert.equal(nombrePeriodo('2026-11'), 'noviembre 2026');
});

test('por quincena: la 2.ª va del 16 a fin de mes', () => {
  const aj = ajustes({ periodo: 'quincenal' });
  assert.equal(periodoDe('2026-10-20', aj), '2026-10-2');
  assert.deepEqual(rango('2026-10-2'), ['2026-10-16', '2026-10-31']);
});

test('se cobra el 4.º día hábil, salteando fines de semana y feriados', () => {
  const aj = ajustes();
  assert.equal(cobroDe('2026-10', aj), '2026-11-05');
  assert.equal(cobroDe('2026-11', aj), '2026-12-04');
  assert.equal(cobroDe('2026-12', aj), '2027-01-07'); // el 1 de enero es feriado
});

test('los descuentos del recibo suman 21,5%', () => {
  assert.equal(ajustes().descTotal, 21.5);
});

test('ajustes inválidos vuelven al valor por defecto', () => {
  const aj = ajustesEfectivos({ horasJornada: -3, horaEntrada: 'cualquiera', periodo: 'semanal' }, () => '');
  assert.equal(aj.horasJornada, 8); assert.equal(aj.horaEntrada, '06:00'); assert.equal(aj.periodo, 'mensual');
});

test('migración: quien cobraba por quincena pasa a mes y conserva sus descuentos', () => {
  const propios = [{ id: 'x', nombre: 'Seguro de vida', pct: 1.25 }];
  const n = migrarAjustes({ ver: 2, periodo: 'quincenal', descuentos: propios });
  assert.equal(n.ver, AJ_VER); assert.equal(n.periodo, undefined); assert.deepEqual(n.descuentos, propios);
  assert.equal(migrarAjustes(n), null);
});

test('al juntar dos copias queda la versión más nueva de cada día y los borrados no vuelven', () => {
  const a = normalize({ turnos: { d1: { fecha: '2026-11-17', entrada: '06:00', salida: '14:00', mod: 1 }, d2: { fecha: '2026-11-18', entrada: '06:00', salida: '14:00', mod: 1 } } });
  const b = normalize({ turnos: { d1: { fecha: '2026-11-17', entrada: '06:00', salida: '18:00', mod: 2 } }, borrados: { d2: 5 } });
  const m = mergeStates(a, b);
  assert.equal(m.turnos.d1.salida, '18:00');
  assert.equal(m.turnos.d2, undefined);
});

test('al cargar datos raros, se descartan los registros inválidos', () => {
  const s = normalize({ turnos: { ok: { fecha: '2026-11-17', entrada: '06:00', salida: '14:00' }, mal: { fecha: 'ayer' } } });
  assert.deepEqual(Object.keys(s.turnos), ['ok']);
});
