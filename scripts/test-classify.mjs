import assert from 'node:assert/strict';
import { classify, clusterItems } from './classify.mjs';
const T = (title, exp) => {
  const r = classify({ title });
  const got = r ? `${r.c}|${r.t}|${r.l}` : null;
  if (got !== exp) { console.log('FALLA:', title, '=>', got, '(esperado', exp + ')'); process.exitCode = 1; }
};
T('Pokémon TCG: Megaevolución—Equilibrio Perfecto Caja de Entrenador Élite (Español)', 'equilibrio-perfecto|etb|ES');
T('ETB Perfect Order Pokemon TCG English', 'equilibrio-perfecto|etb|EN');
T('Pokemon TCG: Mega Evolution - Booster Bundle (Inglés)', 'megaevolucion|bundle|EN');
T('Pokémon TCG Mega Evolution—Ascended Heroes Elite Trainer Box', 'heroes-ascendentes|etb|?');
T('Evoluciones Prismáticas Booster Bundle Español', 'evoluciones-prismaticas|bundle|ES');
T('Prismatic Evolutions Surprise Box', 'evoluciones-prismaticas|collection|?');
T('Rivales Predestinados Display 36 sobres Español', 'rivales-predestinados|booster_box|ES');
T('Pokémon TCG Fulgor Negro Booster Bundle', 'fulgor-negro-llama-blanca|bundle|?');
T('Caja Colección Celebración 30 Aniversario Mew Figura', '30-aniversario|collection|?');
T('POKEMON TCG 30th Mini Tins ESPAÑOL', '30-aniversario|tin|ES');
T('Pokémon TCG 30th Celebration ETB Inglés', '30-aniversario|etb|EN');
T('Blíster 2 Sobres 30 Aniversario Español', '30-aniversario|blister|ES');
T('Colección Ilustración Primer Compañero 30.º Aniversario Booster Bundle', 'primer-companero|bundle|?');
T('Caja Pokémon Day 2026 Español', 'pokemon-day|collection|ES');
T('Pokémon TCG Caos Creciente Booster Box Japonés', 'caos-creciente|booster_box|JP');
T('Chispas Fulgurantes Mini Tin', 'chispas-fulgurantes|tin|?');
T('Pokémon TCG Juntos de Aventuras Blister 3 Sobres', 'juntos-de-aventuras|blister|?');
T('Sobres cartas Corona Astral Escarlata & Purpura Pokemon español', null);
T('Pokémon TCG Temporal Forces ETB', null);
T('Pokémon Celebraciones 25 aniversario Blister', null);
T('One Piece Card Game Booster Box OP-09', null);
T('Peluche Pikachu Pokémon 30 aniversario', null);
T('Pikachu V 044/185 Pokémon carta suelta', null);
T('Fundas Pokémon Ultra Pro Eevee 65 unidades', 'accesorios|accessory|?');
T('Pokémon TCG Carpeta para colecciones 30 Aniversario Español', '30-aniversario|collection|ES');
T('Pokémon TCG Mazo de Combate Espeon ex 30 Aniversario Español', '30-aniversario|deck|ES');
T('Pokémon TCG Ultra-Premium Collection Equilibrio Perfecto', 'equilibrio-perfecto|upc|?');
T('Pokémon TCG Megaevolución Oscuridad Absoluta Booster Bundle ES', 'oscuridad-absoluta|bundle|ES');
T('Pokemon Battle Deck Lucario (Inglés)', 'otros|deck|EN');
T('Figura Pokémon Funko Pop Charizard', null);
const mk = title => ({ title, cls: classify({ title }) });
const cl = clusterItems([
  mk('Caja Colección Celebración 30 Aniversario Mew Figura Español'),
  mk('Pokémon TCG Figure Collection Mew 30 Aniversario Español'),
  mk('Colección con Figura Mewtwo 30 aniversario Español'),
  mk('Figure Collection Mewtwo 30th Celebration Español'),
]);
assert.equal(cl.length, 2, 'Mew y Mewtwo deben ser 2 grupos, hay ' + cl.length);
assert.ok(cl.every(c => c.items.length === 2));
const cl2 = clusterItems([mk('ETB Perfect Order Pokemon TCG English'), mk('Pokémon TCG Megaevolución Equilibrio Perfecto Caja de Entrenador Élite Inglés')]);
assert.equal(cl2.length, 1);
console.log(process.exitCode ? 'HAY FALLOS' : 'Todas las pruebas OK');
