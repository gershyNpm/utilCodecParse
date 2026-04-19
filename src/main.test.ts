import { assertEqual, testRunner } from '../build/utils.test.ts';
import codecParse from './main.ts';

// Type testing
(async () => {
  
  type Enforce<Provided, Expected extends Provided> = { provided: Provided, expected: Expected };
  
  type Tests = {
    1: Enforce<{ x: 'y' }, { x: 'y' }>,
  };
  
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
    )
    
    } catch (err: any) {
      
      console.log('ARGS', err.args);
      console.log(err.fn.toString());
      
    }
    
  }}
  
]);