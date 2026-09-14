/**
 * The local fallback reader.
 *
 * What matters here is not how much it understands — it is a keyword reader,
 * not the model — but that everything it claims to have understood is right,
 * and that a sentence it cannot read leaves the defaults alone rather than
 * inventing something. A wrong prefill is worse than no prefill: the person
 * gets a house laid out against a road that is not there.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBrief, briefFrom } from '../web/src/lib/readBrief.ts';

test('reads the sample prompt the home page offers', () => {
  const read = readBrief('4 aana in Bhaktapur, road on the east, 3 bedrooms and a puja room');
  assert.deepEqual(read.land.area, { value: 4, unit: 'aana' });
  assert.equal(read.land.roadSide, 'east');
  assert.equal(read.requirements.bedrooms, 3);
  assert.equal(read.requirements.puja, true);
});

test('reads the Nepali sample, Devanagari digits and half storeys', () => {
  const read = readBrief('साढे दुई तले घर, ३ शयनकक्ष, माथि छुट्टै भाडाको फ्ल्याट, इँटाको अनुहार');
  // Two and a half storeys is three floors to lay out, not two.
  assert.equal(read.requirements.floors, 3);
  assert.equal(read.requirements.bedrooms, 3);
});

test('reads romanised Nepali mixed with English', () => {
  const read = readBrief('40 by 60 feet jagga, single storey bungalow, thulo kitchen');
  assert.equal(read.land.widthFt, 40);
  assert.equal(read.land.depthFt, 60);
  assert.equal(read.requirements.floors, 1);
});

test('"parking chaahidaina" beats the word parking', () => {
  assert.equal(readBrief('4 aana, parking chaahidaina').requirements.parkingCars, 0);
  assert.equal(readBrief('4 aana, no parking').requirements.parkingCars, 0);
  assert.equal(readBrief('4 aana, parking for one car').requirements.parkingCars, 1);
});

test('a compass word without a road does not become the road side', () => {
  // "east Kathmandu" is a place, not a frontage.
  assert.equal(readBrief('8 aana in east Kathmandu, 4 bedrooms').land.roadSide, undefined);
  assert.equal(readBrief('8 aana, road on the west').land.roadSide, 'west');
});

test('nonsense reads as nothing rather than as something', () => {
  const read = readBrief('hello please help me');
  assert.deepEqual(read.land, {});
  assert.deepEqual(read.requirements, {});
  assert.deepEqual(read.found, []);
});

test('an unreadable sentence still yields the ordinary defaults', () => {
  const brief = briefFrom(readBrief('hello please help me'));
  assert.deepEqual(brief.land.area, { value: 4, unit: 'aana' });
  assert.equal(brief.land.roadSide, 'south');
  assert.equal(brief.requirements.floors, 2);
  assert.equal(brief.requirements.bedrooms, 3);
});

test('stated dimensions replace the default area rather than sitting beside it', () => {
  const brief = briefFrom(readBrief('30 by 45 feet plot'));
  assert.equal(brief.land.widthFt, 30);
  assert.equal(brief.land.depthFt, 45);
  assert.equal(brief.land.area, undefined);
});

test('absurd numbers are clamped, not passed through', () => {
  const read = readBrief('9999 bedrooms on 4 aana');
  assert.equal(read.requirements.bedrooms, 12);
  // A "40 by 60" that is really 4000 by 6000 is not a plot.
  assert.equal(readBrief('4000 by 6000').land.widthFt, undefined);
});

test('other land units are recognised', () => {
  assert.deepEqual(readBrief('2 ropani land').land.area, { value: 2, unit: 'ropani' });
  assert.deepEqual(readBrief('3 kattha ma ghar').land.area, { value: 3, unit: 'kattha' });
  assert.deepEqual(readBrief('1200 sq ft plot').land.area, { value: 1200, unit: 'sqft' });
});
