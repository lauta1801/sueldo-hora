// Reglas para repartir cada día en horas normales y extras
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcDia, resumenDe } from '../js/calculo.js';
import { ajustes, escalas, turno, otro } from './ayuda.js';

const dia = (ts, cambios) => calcDia(Array.isArray(ts) ? ts : [ts], ajustes(cambios), escalas());

test('día de semana de 6 a 18: 8 h normales y 4 h extra al 50%', () => {
  const D = dia(turno('2026-11-17', '06:00', '18:00'));
  assert.equal(D.normal, 480); assert.equal(D.e50, 240); assert.equal(D.e100, 0);
});

test('sábado: las extras después de las 13 van al 100%', () => {
  const D = dia(turno('2026-11-21', '06:00', '18:00'));
  assert.equal(D.e50, 0); assert.equal(D.e100, 240);
});

test('domingo: todas las extras al 100%', () => {
  const D = dia(turno('2026-11-22', '06:00', '16:00'));
  assert.equal(D.e100, 120);
});

test('feriado trabajado: se paga el jornal doble', () => {
  const D = dia(turno('2026-11-23', '06:00', '14:00'));
  assert.ok(D.fer);
  assert.equal(D.ferTrab, D.jornal);
});

test('llegar 20 minutos tarde descuenta ese tiempo y el premio puntualidad del día', () => {
  const D = dia(turno('2026-11-17', '06:20', '14:00'));
  assert.equal(D.tarde, 20); assert.equal(D.falta, 20); assert.equal(D.punt, 0);
  assert.ok(Math.abs(D.mFalta - 20 / 60 * D.vh) < 1e-9);
});

test('con tolerancia de 30 minutos no se considera tarde', () => {
  const D = dia(turno('2026-11-17', '06:20', '14:00'), { tolerancia: 30 });
  assert.equal(D.tarde, 0); assert.ok(D.punt > 0);
});

test('la pausa sin goce se descuenta primero de las horas normales', () => {
  const D = dia(turno('2026-11-17', '06:00', '14:00', { pausa: 30 }));
  assert.equal(D.normal, 450); assert.equal(D.falta, 30);
});

test('salir y volver a entrar el mismo día no es llegada tarde', () => {
  const D = dia([turno('2026-11-17', '06:00', '12:00'), turno('2026-11-17', '13:00', '18:00')]);
  assert.equal(D.tarde, 0);
  assert.equal(D.normal, 420); assert.equal(D.e50, 240);
});

test('las extras se pueden contar de a media hora', () => {
  const D = dia(turno('2026-11-17', '06:00', '18:20'), { redondeo: 30 });
  assert.equal(D.e50, 240);
});

test('enfermedad con certificado: se cobra el jornal sin adicional, premios ni viáticos', () => {
  const D = dia(otro('2026-11-18', 'enfermedad'));
  assert.equal(D.pagoEnf, D.tar.jornal);
  assert.equal(D.adic + D.punt + D.prod + D.noRem, 0);
});

test('una falta no se cobra', () => {
  assert.equal(dia(otro('2026-11-18', 'falta')).neto, 0);
});

test('si se pierde el premio de todo el período, una llegada tarde lo anula entero', () => {
  const ts = [turno('2026-11-17', '06:00', '14:00'), turno('2026-11-18', '06:10', '14:00')];
  const R = resumenDe(ts, '2026-11-01', '2026-11-30', ajustes({ puntualidadTarde: 'periodo' }), escalas(), {});
  assert.equal(R.punt, 0);
});

test('cada mes usa su escala: noviembre con el aumento del 1,7%', () => {
  const D = dia(turno('2026-11-17', '06:00', '14:00'));
  assert.equal(D.tar.jornal, 43583.78);
});
