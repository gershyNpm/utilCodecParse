import '@gershy/clearing';

export namespace Codec {
  
  export type Nul                                         = { type: 'nul',   map?: (val: null)                          => any };
  export type Bln                                         = { type: 'bln',   map?: (val: boolean)                       => any };
  export type Num                                         = { type: 'num',   map?: (val: number)                        => any }; // TODO: minVal, maxVal
  export type Str                                         = { type: 'str',   map?: (val: string)                        => any, minLen?: number, maxLen?: number,  };
  export type Arr<I extends Reg>                          = { type: 'arr',   map?: (val: Out<I>[])                      => any, minLen?: number, maxLen?: number, item: I };
  export type Map<I extends Reg>                          = { type: 'map',   map?: (val: Obj<Out<I>>)                   => any, minLen?: number, maxLen?: number, item: I };
  export type Rec<O extends Obj<Reg & { req?: boolean }>> = { type: 'rec',   map?: (val: { [K in keyof O]: Out<O[K]> }) => any, props: O, loose?: boolean /* default false */ };
  export type Enum<Opts extends readonly Json[]>          = { type: 'enum',  map?: (val: Opts[number])                  => any, opts: Opts };
  export type OneOf<Opts extends Reg[]>                   = { type: 'oneOf', map?: (val: Out<Opts[number]>)             => any, opts: Opts };
  export type Any                                         = { type: 'any',   map?: (val: any)                           => any };
  
  // TODO: the `X<any>` generics kill any deeper typing; codec definitions can't be validated...
  export type Reg = Nul | Bln | Num | Str | Arr<any> | Map<any> | Rec<any> | Enum<any> | OneOf<any> | Any;
  
  type RecOut<P extends Obj<Reg>> = P extends Obj<Reg & { req?: boolean }>
    ? {
        [K in keyof P]: never
          | Out<P[K]>
          | (P[K] extends Reg & { req: false } ? undefined : never)
      }
    : never;
  
  export type Out<C extends Reg> = 0 extends 1 ? never
    
    // If there's a mapping function return its value
    : C extends { map: (val: any) => infer Mapped } ? Mapped
    
    // Broad types immediately resolve to `any`
    : string extends C['type'] ? any
    
    : C extends { type: 'nul' }  ? null
    : C extends { type: 'bln' }  ? boolean
    : C extends { type: 'num' }  ? number
    : C extends { type: 'str' }  ? string
    : C extends { type: 'enum',  opts:  readonly (infer O)[] } ? O
    : C extends { type: 'arr',   item:  infer I }              ? I extends Reg      ? Out<I>[]    : never
    : C extends { type: 'map',   item:  infer I }              ? I extends Reg      ? Obj<Out<I>> : never
    : C extends { type: 'rec',   props: infer P }              ? P extends Obj<Reg> ? RecOut<P>   : never
    : C extends { type: 'oneOf', opts:  (infer O)[] }          ? O extends Reg      ? Out<O>      : never
    
    // // Type lookup
    // : C extends { type: infer T } ? T extends string ? ({ [K: keyof any]: never } & {
    //     
    //     nul:   null,
    //     bln:   boolean,
    //     num:   number,
    //     str:   string,
    //     enum:  C extends { opts:  readonly (infer O)[] } ? O                                : never,
    //     arr:   C extends { item:  infer I }              ? I extends Reg      ? Out<I>[]    : never : never,
    //     map:   C extends { item:  infer I }              ? I extends Reg      ? Obj<Out<I>> : never : never,
    //     rec:   C extends { props: infer P }              ? P extends Obj<Reg> ? RecOut<P>   : never : never,
    //     oneOf: C extends { opts:  readonly (infer O)[] } ? O extends Reg      ? Out<O>      : never : never,
    //     any:   any
    //     
    //   })[T] : never
    
    : never;
  
  // // Reproduce the variance problem - minimal version from LambdaEdge
  // class MinimalBase<Cdc extends Rec<any>> {
  //   prop!: { invokeFn: (ctx: { args: Out<Cdc> }) => void };
  // }
  // 
  // class MinimalChild extends MinimalBase<{ type: 'rec', props: {} }> {
  //   prop = { invokeFn: (ctx: { args: Out<{ type: 'rec', props: {} }> }) => {} };
  // }
  // 
  // const acceptBase = <T extends MinimalBase<any>>(x: T) => {};
  // acceptBase(new MinimalChild());  // Error: args types incompatible (unknown vs {})
  
};

export default <C extends Codec.Reg>(codec: C, val: unknown): Codec.Out<C> => {
  
  type AssertArgs<T> = {
    desc: string,
    chain: string[],
    ctx: Obj<any>,
    args: T,
    fn: (args: T) => boolean
  };
  const assert = <T>(args: AssertArgs<T>) => {
    
    try         { if (!args.fn(args.args)) throw Error('assert failed');       }
    catch (err) { throw (err as Error)[cl.mod]({ codecParse: true, ...args }); }
    
  };
  const parse = (codec: Codec.Reg, val: unknown, chain: string[], ctx: Obj<any>) => {
    
    const checked = (() => {
      
      if (codec.type === 'nul') {
        
        assert({ desc: 'nul', chain, ctx, args: val, fn: val => val === null });
        return val;
        
      } else if (codec.type === 'bln') {
        
        assert({ desc: 'bln', chain, ctx, args: val, fn: val => cl.isCls(val, Boolean) });
        return val;
        
      } else if (codec.type === 'num') {
        
        assert({ desc: 'num', chain, ctx, args: val, fn: val => cl.isCls(val, Number) });
        return val;
        
      } else if (codec.type === 'str') {
        
        const { minLen = 0, maxLen = Number[cl.int64] } = codec;
        assert({
          desc: 'str', chain, ctx,
          args: { val, minLen, maxLen },
          fn: ({ val, minLen, maxLen }) => true
            && cl.isCls(val, String)
            && val.length >= minLen
            && val.length <= maxLen,
        });
        return val;
        
      } else if (codec.type === 'arr') {
        
        const { minLen = 0, maxLen = Number[cl.int64], item } = codec;
        
        assert({
          desc: 'arr', chain, ctx,
          args: { val, minLen, maxLen },
          fn: ({ val, minLen, maxLen }) => true
            && cl.isCls(val, Array)
            && val.length >= minLen
            && val.length <= maxLen
        });
        return (val as any[])[cl.map]((v, i) => parse(item, v, [ ...chain, i.toString(10) ], ctx));
        
      } else if (codec.type === 'enum') {
        
        const { opts } = codec;
        assert({
          desc: 'enum', chain, ctx,
          args: { val, opts },
          fn: ({ val, opts }) => opts.includes(val as any)
        });
        return val;
        
      } else if (codec.type === 'map') {
        
        const { item } = codec;
        assert({
          desc: 'map', chain, ctx,
          args: val,
          fn: val => cl.isCls(val, Object)
        });
        return (val as Obj<any>)[cl.map]((v, k) => parse(item, v, [ ...chain, k ], ctx));
        
      } else if (codec.type === 'rec') {
        
        type Prop = Codec.Reg & { req?: boolean };
        const { props, loose = false } = codec as Codec.Rec<Obj<Prop>>;
        
        const keys = props[cl.toArr]((v, k) => k);
        const reqKeys = props[cl.toArr]((v, k) => (v.req ?? true) ? k : cl.skip);
        // const optKeys = props[cl.toArr]((v, k) => (v.req ?? true) ? cl.skip : k);
        
        assert({ desc: 'rec.obj', chain, ctx, args: { val }, fn: (args): args is { val: Obj<any> } => cl.isCls(args.val, Object) });
        assert({ desc: 'rec.req', chain, ctx, args: { val, reqKeys }, fn: ({ val, reqKeys }) => {
          return reqKeys.every(rk => (val as any)[cl.has](rk));
        }});
        
        if (!loose)
          assert({ desc: 'rec.tight', chain, ctx, args: { val, keys }, fn: ({ val, keys }) => {
            return (val as Obj<Prop>)
              [cl.toArr]((v, k) => k)
              .every(k => keys.includes(k)); // TODO: O(|val| x |keys|)!!
          }});
        
        // assert({ desc: 'rec', chain, ctx, args: { val, keys, loose }, fn: ({ val, keys, loose }) => true
        //   && cl.isCls(val, Object)
        //   && (loose || val[cl.count]() === keys[cl.count]())
        //   && keys.every(k => val[cl.has](k))
        // });
        
        return (val as Obj<any>)[cl.map]((v, k) => {
          
          return props[cl.has](k)
            
            // `k` is actually declared in `props`
            ? parse(props[k], v, [ ...chain, k ], ctx)
            
            // `k` isn't declared in `props` - `loose` must be set to `true`
            : v;
          
        });
        
      } else if (codec.type === 'oneOf') {
        
        const { opts } = codec;
        const { result, opt: _opt } = (() => {
          
          const errs: any[] = [];
          for (const opt of opts) {
            
            try {
              
              const result = parse(opt, val, [ ...chain, `opt(${opt.type})` ], ctx);
              return { result, opt };
              
            } catch (err) { errs.push(err) }
            
          }
          
          throw Error('all options failed')[cl.mod]({ codecParse: true, desc: 'oneOf', chain, ctx, args: val, errs });
          
        })();
        
        return result;
        
      } else if (codec.type === 'any') {
        
        return val;
        
      }
      
      type Assert<A, B extends A> = { a: A, b: B };
      type J = Assert<never, typeof codec>;
      if (0) ((v?: J) => void 0)();
      
    })();
    
    if (codec.map) {
      
      try { return (codec.map as any)(checked); } catch (err: any) {
        
        if (!err.codecParse) throw err;
        throw err[cl.mod](msg => ({ msg: `map failed (${msg})`, chain, ctx, fn: codec.map }));
        
      }
      
    } else {
      
      return checked;
      
    }
    
  };
  
  return parse(codec, val, [], {});
  
};
