// La app tiene que dar lo mismo que el recibo real de la 2.ª quincena de octubre de 2026:
// 11 días trabajados, 19 h extra al 50% y 9 h al 100%, con el premio producción que figura en el recibo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenDe } from '../js/calculo.js';
import { ajustes, escalas, turno } from './ayuda.js';

const dias = [
  turno('2026-10-20', '06:00', '14:00'),
  turno('2026-10-21', '06:00', '18:00'),
  turno('2026-10-22', '06:00', '18:00'),
  turno('2026-10-23', '06:00', '18:00'),
  turno('2026-10-24', '06:00', '18:00'), // sábado
  turno('2026-10-26', '06:00', '18:00'),
  turno('2026-10-27', '06:00', '17:00'),
  turno('2026-10-28', '06:00', '14:00'),
  turno('2026-10-29', '06:00', '14:00'),
  turno('2026-10-30', '06:00', '14:00'),
  turno('2026-10-31', '06:00', '19:00')  // sábado
];
const R = resumenDe(dias, '2026-10-01', '2026-10-31', ajustes(), escalas(), { premioReal: 254648.63 });

test('cuenta los días y las horas extra del recibo', () => {
  assert.equal(R.dias, 11);
  assert.equal(R.e50, 19 * 60);
  assert.equal(R.e100, 9 * 60);
  assert.equal(R.diasTarde, 0);
});

test('cada línea da lo mismo que el recibo', () => {
  assert.equal(R.jornal, 471407.64);    // 2600 Días trabajados: 11 × 42.855,24
  assert.equal(R.m50, 152671.79);       // 1000 Extras 50%: 19 h × 8.035,36
  assert.equal(R.m100, 96424.29);       // 1500 Extras 100%: 9 h × 10.713,81
  assert.equal(R.punt, 27500);          // 4200 Premio puntualidad
  assert.equal(R.prod, 254648.63);      // 6690 Premio producción
  assert.equal(R.comida, 189550.79);    // 6090 Comida: 11 × 17.231,89
  assert.equal(R.especial, 95116.23);   // 5180 Viático especial: 11 × 8.646,93
});

test('los totales coinciden con el recibo', () => {
  assert.equal(R.noRem, 335907.08);
  assert.equal(R.descTotal, 233813.73);
  assert.equal(R.neto, 1189599.08);
  // El recibo redondea el adicional 4250 un centavo para abajo: remunerativo 1.087.505,72
  assert.ok(Math.abs(R.rem - 1087505.72) <= 0.011);
});
