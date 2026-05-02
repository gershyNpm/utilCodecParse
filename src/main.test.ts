import { assertEqual, testRunner } from '../build/utils.test.ts';
import codecParse, { type Codec } from './main.ts';

// Type testing
(async () => {
  
  type Enforce<Provided, Expected extends Provided> = { provided: Provided, expected: Expected };
  
  type Tests = {
    1: Enforce<{ x: 'y' }, { x: 'y' }>,
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
    
    try {
    
    assertEqual(
      codecParse(codec, { a: true, b: 123 }),
      { a: 'ya', b: 'i love you times 123' }
    );
    
    } catch (err: any) {
      
      console.log('ARGS', err.args);
      console.log(err.fn.toString());
      
    }
    
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