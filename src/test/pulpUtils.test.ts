import { describe, expect, it } from 'vitest';
import { parsePulpLabelsJson, stripPulpOrigin } from '../utils/pulp';

describe('pulp utils', () => {
  describe('stripPulpOrigin', () => {
    it('returns empty string for empty/whitespace input', () => {
      expect(stripPulpOrigin('')).toBe('');
      expect(stripPulpOrigin('   ')).toBe('');
    });

    it('returns trimmed path for non-absolute href', () => {
      expect(stripPulpOrigin('/pulp/api/v3/distributions/rpm/rpm/1/')).toBe(
        '/pulp/api/v3/distributions/rpm/rpm/1/'
      );
      expect(stripPulpOrigin('  /x/y/  ')).toBe('/x/y/');
    });

    it('strips origin from absolute URL', () => {
      expect(stripPulpOrigin('http://localhost:8080/pulp/api/v3/groups/?a=1')).toBe(
        '/pulp/api/v3/groups/'
      );
    });

    it('returns trimmed input when URL parsing fails', () => {
      expect(stripPulpOrigin('https://')).toBe('https://');
    });
  });

  describe('parsePulpLabelsJson', () => {
    it('returns nulls for empty/whitespace input', () => {
      expect(parsePulpLabelsJson('')).toEqual({ labels: null, error: null });
      expect(parsePulpLabelsJson('  \n\t ')).toEqual({ labels: null, error: null });
    });

    it('parses an object of string values', () => {
      expect(parsePulpLabelsJson('{"env":"dev"}')).toEqual({
        labels: { env: 'dev' },
        error: null,
      });

      expect(parsePulpLabelsJson('{"a":"1","b":"two"}')).toEqual({
        labels: { a: '1', b: 'two' },
        error: null,
      });
    });

    it('accepts an empty object', () => {
      expect(parsePulpLabelsJson('{}')).toEqual({ labels: {}, error: null });
    });

    it('rejects invalid JSON', () => {
      expect(parsePulpLabelsJson('{')).toEqual({
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      });
    });

    it('rejects arrays and non-object JSON', () => {
      expect(parsePulpLabelsJson('[]')).toEqual({
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      });
      expect(parsePulpLabelsJson('"x"')).toEqual({
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      });
      expect(parsePulpLabelsJson('null')).toEqual({
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      });
    });

    it('rejects object values that are not strings', () => {
      expect(parsePulpLabelsJson('{"k":1}')).toEqual({
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      });
      expect(parsePulpLabelsJson('{"k":true}')).toEqual({
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      });
    });
  });
});
