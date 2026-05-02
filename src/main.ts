import '@gershy/clearing';

export namespace Codec {
  
  export type Base = { type: string, map?: (val: any) => any };
  
  export type Bln                         = Base & { type: 'bln',   map?: (val: boolean)                       => any };
  export type Num                         = Base & { type: 'num',   map?: (val: number)                        => any };
  export type Str                         = Base & { type: 'str',   map?: (val: string)                        => any, minLen?: number, maxLen?: number,  };
  export type Arr<I extends Base>         = Base & { type: 'arr',   map?: (val: Out<I>[])                      => any, minLen?: number, maxLen?: number, item: I };
  export type Map<I extends Base>         = Base & { type: 'map',   map?: (val: Obj<Out<I>>)                   => any, minLen?: number, maxLen?: number, item: I };
  export type Rec<O extends Obj<Base>>    = Base & { type: 'rec',   map?: (val: { [K in keyof O]: Out<O[K]> }) => any, props: O };
  export type Enum<Opts extends string[]> = Base & { type: 'enum',  map?: (val: Opts[number])                  => any, opts: Opts };
  export type OneOf<Opts extends Base[]>  = Base & { type: 'oneOf', map?: (val: Out<Opts[number]>)             => any, opts: Opts };
  export type Any                         = Base & { type: 'any',   map?: (val: any)                           => any };

  export type Out<C extends Base> = 0 extends 1
    ? never
    : C extends Bln               ? boolean
    : C extends Num               ? number
    : C extends Str               ? string
    : C extends Arr<infer I>      ? Out<I>[]
    : C extends Map<infer I>      ? Obj<Out<I>>
    : C extends Rec<infer O>      ? { [K in keyof O]: Out<O[K]> }
    : C extends Enum<infer Opts>  ? Opts[number]
    : C extends OneOf<infer Opts> ? Out<Opts[number]>
    : C extends Any               ? any
    : never;
  
  export type Registry = Bln | Num | Str | Arr<any> | Map<any> | Rec<any> | Enum<any> | OneOf<any> | Any;
  
};

export default (codec: Codec.Registry, val: unknown) => {
  
  type AssertArgs<T> = {
    desc: string,
    chain: string[],
    ctx: Obj<any>,
    args: T,
    fn: (args: T) => boolean
  };
  const assert = <T>(args: AssertArgs<T>) => {
    
    try {
      
      if (!args.fn(args.args)) throw Error('assert failed');
      
    } catch (err) {
      
      throw (err as Error)[cl.mod]({ codecParse: true, ...args });
      
    }
    
  };
  const parse = (codec: Codec.Registry, val: unknown, chain: string[], ctx: Obj<any>) => {
    
    const checked = (() => {
      
      if (codec.type === 'bln') {
        
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
        
        const { props } = codec;
        assert({
          desc: 'rec', chain, ctx,
          args: { val, keys: props[cl.toArr]((v, k) => k) },
          fn: ({ val, keys }) => true
            && cl.isCls(val, Object)
            && val[cl.count]() === keys[cl.count]()
            && keys.every(k => val[cl.has](k))
        });
        return (val as Obj<any>)[cl.map]((v, k) => parse(props[k], v, [ ...chain, k ], ctx));
        
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
      
      try { return codec.map(checked as any); } catch (err: any) {
        
        if (!err.codecParse) throw err;
        throw err[cl.mod](msg => ({ msg: `map failed (${msg})`, chain, ctx, fn: codec.map }));
        
      }
      
    } else {
      
      return checked;
      
    }
    
  };
  
  return parse(codec, val, [], {});
  
};
