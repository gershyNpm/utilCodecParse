import { assertEqual, cmpAny, testRunner } from '../build/utils.test.ts';
import codecParse, { type Codec } from './main.ts';

// Type testing
(async () => {
  
  type Assert<V extends true> = V;
  type Equal<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
  
  type Tests = {
    
    1: Assert<Equal<
        Codec.Out<{ type: 'str', map: (v: string) => number }>,
        number
      >>,
    
    2: Assert<Equal<Codec.Out<{ type: 'enum', opts: readonly [ 1, 2 ] }>, 1 | 2>>,
    3: Assert<Equal<Codec.Out<{ type: 'enum', opts: [1, 2] }>, 1 | 2>>,
    
    4: Assert<Equal<
        Codec.Out<{
          type: 'rec',
          props: {
            a: { type: 'str' },
            b: { type: 'num', req: false },
            c: { type: 'arr', req: true, item: { type: 'bln', map: (v) => 'ya' | 'no' } }
          }
        }>,
        {
          a: string,
          b: number | undefined,
          c: ('ya' | 'no')[]
        }
      >>
    
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
    
    const codec: Codec.Reg = {
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
    
    assertEqual(
      cl.safe(() => codecParse(codec, { a: 'a', b: { c: { d: { e: 1 } } } }), err => err),
      new Error('all options failed')[cl.mod]({
        args: { c: { d: { e: 1 } } },
        chain: [ 'b' ],
        codecParse: true,
        ctx: {},
        desc: 'oneOf',
        errs: [
          cmpAny,
          new Error('all options failed')[cl.mod]({
            args: cmpAny,
            chain: [ 'b', 'opt(map)', 'c' ],
            codecParse: cmpAny,
            ctx: cmpAny,
            desc: cmpAny,
            errs: [
              cmpAny,
              new Error('all options failed')[cl.mod]({
                args: cmpAny,
                chain: [ 'b', 'opt(map)', 'c', 'opt(map)', 'd' ],
                codecParse: cmpAny,
                ctx: cmpAny,
                desc: cmpAny,
                errs: [
                  cmpAny,
                  new Error('all options failed')[cl.mod]({
                    args: cmpAny,
                    chain: [ 'b', 'opt(map)', 'c', 'opt(map)', 'd', 'opt(map)', 'e' ],
                    codecParse: cmpAny,
                    ctx: cmpAny,
                    desc: cmpAny,
                    errs: [
                      new Error('assert failed')[cl.mod]({
                        args: cmpAny,
                        chain: [ 'b', 'opt(map)', 'c', 'opt(map)', 'd', 'opt(map)', 'e', 'opt(str)' ],
                        codecParse: cmpAny,
                        ctx: cmpAny,
                        desc: cmpAny,
                        fn: cmpAny
                      }),
                      new Error('assert failed')[cl.mod]({
                        args: cmpAny,
                        chain: [ 'b', 'opt(map)', 'c', 'opt(map)', 'd', 'opt(map)', 'e', 'opt(map)' ],
                        codecParse: cmpAny,
                        ctx: cmpAny,
                        desc: cmpAny,
                        fn: cmpAny,
                      }),
                    ]
                  })
                ]
              })
            ]
          }),
        ]
      })
    );
    
  }}
  
]);