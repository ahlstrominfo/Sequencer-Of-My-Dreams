/* eslint-disable no-undef */
const { ARP_MODES, generateArpeggioPattern } = require('../src/utils/arps');

describe('generateArpeggioPattern', () => {
    test('UP mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.UP)).toEqual([0, 1, 2]);
        expect(generateArpeggioPattern(5, ARP_MODES.UP)).toEqual([0, 1, 2, 3, 4]);
      });
    
      test('DOWN mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.DOWN)).toEqual([2, 1, 0]);
        expect(generateArpeggioPattern(5, ARP_MODES.DOWN)).toEqual([4, 3, 2, 1, 0]);
      });
    
      test('UP_DOWN mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.UP_DOWN)).toEqual([0, 1, 2, 1]);
        expect(generateArpeggioPattern(5, ARP_MODES.UP_DOWN)).toEqual([0, 1, 2, 3, 4, 3, 2, 1]);
      });
    
      test('DOWN_UP mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.DOWN_UP)).toEqual([2, 1, 0, 1]);
        expect(generateArpeggioPattern(5, ARP_MODES.DOWN_UP)).toEqual([4, 3, 2, 1, 0, 1, 2, 3]);
      });
    
      test('UP_AND_DOWN mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.UP_AND_DOWN)).toEqual([0, 1, 2, 2, 1, 0]);
        expect(generateArpeggioPattern(5, ARP_MODES.UP_AND_DOWN)).toEqual([0, 1, 2, 3, 4, 4, 3, 2, 1, 0]);
      });
    
      test('DOWN_AND_UP mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.DOWN_AND_UP)).toEqual([2, 1, 0, 0, 1, 2]);
        expect(generateArpeggioPattern(5, ARP_MODES.DOWN_AND_UP)).toEqual([4, 3, 2, 1, 0, 0, 1, 2, 3, 4]);
      });
    
      test('RANDOM mode', () => {
        const result3 = generateArpeggioPattern(3, ARP_MODES.RANDOM);
        expect(result3).toHaveLength(3);
        expect(new Set(result3).size).toBe(3);
        expect(result3.every(n => n >= 0 && n < 3)).toBe(true);
    
        const result5 = generateArpeggioPattern(5, ARP_MODES.RANDOM);
        expect(result5).toHaveLength(5);
        expect(new Set(result5).size).toBe(5);
        expect(result5.every(n => n >= 0 && n < 5)).toBe(true);
      });
    
      test('ORDER mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.ORDER)).toEqual([0, 1, 2]);
        expect(generateArpeggioPattern(5, ARP_MODES.ORDER)).toEqual([0, 1, 2, 3, 4]);
      });
    
      test('CHORD mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.CHORD)).toEqual([[0, 1, 2]]);
        expect(generateArpeggioPattern(5, ARP_MODES.CHORD)).toEqual([[0, 1, 2, 3, 4]]);
      });
    
      test('OUTSIDE_IN mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.OUTSIDE_IN)).toEqual([2, 0, 1]);
        expect(generateArpeggioPattern(5, ARP_MODES.OUTSIDE_IN)).toEqual([4, 0, 3, 1, 2]);
      });
    
      test('INSIDE_OUT mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.INSIDE_OUT)).toEqual([1, 0, 2]);
        expect(generateArpeggioPattern(4, ARP_MODES.INSIDE_OUT)).toEqual([2,1,3,0]);
        expect(generateArpeggioPattern(5, ARP_MODES.INSIDE_OUT)).toEqual([2, 1, 3, 0, 4]);
      });
    
      test('CONVERGE mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.CONVERGE)).toEqual([0, 2, 1]);
        expect(generateArpeggioPattern(5, ARP_MODES.CONVERGE)).toEqual([0, 4, 1, 3, 2]);
      });
    
      test('DIVERGE mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.DIVERGE)).toEqual([1, 2, 0]);
        expect(generateArpeggioPattern(5, ARP_MODES.DIVERGE)).toEqual([2, 3, 1, 4, 0]);
      });
    
      test('THUMB mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.THUMB)).toEqual([0, 0, 1, 0, 2]);
        expect(generateArpeggioPattern(5, ARP_MODES.THUMB)).toEqual([0, 0, 1, 0, 2, 0, 3, 0, 4]);
      });
    
      test('PINKY mode', () => {
        expect(generateArpeggioPattern(3, ARP_MODES.PINKY)).toEqual([2, 2, 1, 2, 0]);
        expect(generateArpeggioPattern(5, ARP_MODES.PINKY)).toEqual([4, 4, 3, 4, 2, 4, 1, 4, 0]);
      });
});