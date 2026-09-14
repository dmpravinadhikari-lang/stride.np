/**
 * Tests for the upload guardrails.
 *
 * EXIF stripping gets the most attention here because it is the one place in
 * this system where a bug leaks something real: a photo of somebody's house
 * carries their home address in its GPS tags.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepareUpload, MAX_UPLOAD_BYTES } from '../worker/lib/upload.ts';
import { cacheKey } from '../worker/lib/cache.ts';
import { RefusalError } from '../worker/lib/types.ts';

/** A minimal but genuinely valid 1x1 baseline JPEG, APP0/JFIF included. */
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAA' +
    'AQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQR' +
    'BRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF' +
    'RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ip' +
    'qrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEB' +
    'AAA/APn+iiigD//Z',
  'base64',
);

/** The GPS payload a real camera would write into APP1. */
const SECRET_LOCATION = 'GPSLatitude 27.7172 GPSLongitude 85.3240';

function jpegWithExif(): Buffer {
  const payload = Buffer.concat([
    Buffer.from('Exif\0\0', 'latin1'),
    Buffer.from(SECRET_LOCATION, 'latin1'),
  ]);

  const header = Buffer.alloc(4);
  header.writeUInt16BE(0xffe1, 0);
  header.writeUInt16BE(payload.length + 2, 2);

  // Insert APP1 immediately after the SOI marker, where a camera puts it.
  return Buffer.concat([
    MINIMAL_JPEG.subarray(0, 2),
    header,
    payload,
    MINIMAL_JPEG.subarray(2),
  ]);
}

const asFile = (bytes: Buffer, name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

test('strips EXIF GPS data from a JPEG', async () => {
  const withExif = jpegWithExif();
  assert.ok(
    withExif.includes(SECRET_LOCATION),
    'fixture should contain the location before stripping',
  );

  const prepared = await prepareUpload(asFile(withExif, 'house.jpg', 'image/jpeg'));
  const out = Buffer.from(prepared.bytes);

  assert.equal(
    out.includes(SECRET_LOCATION),
    false,
    'GPS data must not survive the upload',
  );
  assert.equal(out.includes(Buffer.from('Exif\0\0', 'latin1')), false);
});

test('keeps the JPEG decodable: SOI, APP0 and EOI intact', async () => {
  const prepared = await prepareUpload(
    asFile(jpegWithExif(), 'house.jpg', 'image/jpeg'),
  );
  const out = Buffer.from(prepared.bytes);

  assert.equal(out[0], 0xff, 'starts with SOI');
  assert.equal(out[1], 0xd8);
  assert.equal(out[2], 0xff, 'APP0 is preserved');
  assert.equal(out[3], 0xe0);
  assert.equal(out.at(-2), 0xff, 'ends with EOI');
  assert.equal(out.at(-1), 0xd9);
});

test('a stripped file still hashes stably', async () => {
  const a = await prepareUpload(asFile(jpegWithExif(), 'a.jpg', 'image/jpeg'));
  const b = await prepareUpload(asFile(jpegWithExif(), 'b.jpg', 'image/jpeg'));

  // Same picture, different filename: must land on the same cache entry, or
  // the same house gets billed twice.
  assert.equal(a.hash, b.hash);
  assert.match(a.hash, /^[0-9a-f]{64}$/);
});

test('two different photos do not collide', async () => {
  const other = Buffer.concat([MINIMAL_JPEG, Buffer.from([0x00])]);
  const a = await prepareUpload(asFile(MINIMAL_JPEG, 'a.jpg', 'image/jpeg'));
  const b = await prepareUpload(asFile(other, 'b.jpg', 'image/jpeg'));

  assert.notEqual(a.hash, b.hash);
});

test('rejects a file that is not an image, whatever it claims to be', async () => {
  const disguised = Buffer.from('#!/bin/sh\nrm -rf /\n');

  await assert.rejects(
    () => prepareUpload(asFile(disguised, 'house.jpg', 'image/jpeg')),
    (err: unknown) =>
      err instanceof RefusalError && err.reason === 'bad_upload',
    'the declared content type must not be trusted',
  );
});

test('rejects an empty file', async () => {
  await assert.rejects(
    () => prepareUpload(asFile(Buffer.alloc(0), 'empty.jpg', 'image/jpeg')),
    (err: unknown) => err instanceof RefusalError,
  );
});

test('rejects a file over the size limit', async () => {
  const huge = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
  MINIMAL_JPEG.copy(huge, 0);

  await assert.rejects(
    () => prepareUpload(asFile(huge, 'huge.jpg', 'image/jpeg')),
    (err: unknown) => err instanceof RefusalError,
  );
});

test('cache key separates style packs and entry points', async () => {
  const base = { entryPoint: 'exterior', stylePackId: 'warm-wood', imageHash: 'abc' } as const;

  const same = await cacheKey({ ...base });
  const repeat = await cacheKey({ ...base });
  const otherStyle = await cacheKey({ ...base, stylePackId: 'luxury-marble' });
  const otherPhoto = await cacheKey({ ...base, imageHash: 'def' });
  const otherEntry = await cacheKey({ ...base, entryPoint: 'interior' });

  assert.equal(same, repeat, 'identical requests must share a cache entry');
  assert.notEqual(same, otherStyle);
  assert.notEqual(same, otherPhoto);
  assert.notEqual(same, otherEntry);
});
