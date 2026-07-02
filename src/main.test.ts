import { assertEqual, testRunner } from '../build/utils.test.ts';
import codecParse, { type Codec } from './main.ts';

// Type testing
(async () => {
  
  type Enforce<Provided, Expected extends Provided> = { provided: Provided, expected: Expected };
  
  const codec1 = { type: 'str', map: (v: string) => v.length } as const;
  const result1 = codecParse(codec1, 'aaa');
  
  const codec2 = {
    type: 'rec',
    props: {
      a: { type: 'str', map: (v: string) => v.length },
      b: { type: 'num', map: (v: number) => 'a'.repeat(v) },
      c: { type: 'arr', item: { type: 'bln', map: (v: boolean) => v ? 'ya' : 'no' }, maxLen: 5 }
    }
  } as const;
  const result2 = codecParse(codec2, {
    a: 'hi',
    b: 12,
    c: [ true, false, true, false ]
  });
  
  type Tests = {
    1: Enforce<typeof result1, number>,
    2: Enforce<typeof result2, {
      a: number,
      b: string,
      c: ('ya' | 'no')[]
    }>
  };
  if (0) ((v?: Tests) => void 0)();
  
})();

testRunner([
  
  { name: 'basic', fn: async () => {
    
    const codec = {
      type: 'rec',
      props: {
        a: { type: 'bln', map: v => v ? 'ya' : 'no' },
        b: { type: 'num', map: v => `i love you times ${v.toString(10)}` }
      }
    } as const;
    
    assertEqual(
      codecParse(codec, { a: true, b: 123 }),
      { a: 'ya', b: 'i love you times 123' }
    );
    
  }},
  
  { name: 'recursive', fn: async () => {
    
    const codec: Codec.Registry = {
      type: 'map',
      item: { type: 'oneOf', opts: [ { type: 'str' } ] }
    };
    codec.item.opts.push(codec);
    
    assertEqual(
      codecParse(codec, { a: 'a', b: 'b' }),
      { a: 'a', b: 'b' }
    );
    assertEqual(
      codecParse(codec, { a: 'a', b: { c: 'c' } }),
      { a: 'a', b: { c: 'c' } }
    );
    assertEqual(
      codecParse(codec, { a: 'a', b: { c: { d: { e: 'e' } } } }),
      { a: 'a', b: { c: { d: { e: 'e' } } } }
    );
    
    // TODO: Test a parsing failure like `{ a: 'a', b: { c: { d: { e: 1 } } } }`
    
  }},
  
]);