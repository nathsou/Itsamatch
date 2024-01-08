/**
 * Defines a data-type variant named `Name` and constructed with `Props`
 */
export type Variant<
  Name extends string,
  Tag extends string = 'variant',
  Props extends Record<string, any> = {},
> = { [K in Tag]: Name } & Props;

export const WRAPPED_VALUE_KEY = '$value';
type WrappedValueKey = typeof WRAPPED_VALUE_KEY;
type IsWrappedValue<T> = T extends { [WRAPPED_VALUE_KEY]: any } ? { [WRAPPED_VALUE_KEY]: any } extends T ? true : false : false;

/**
 * Maps each property in `T` to a Variant constructed with the associated type
 * @example
 * type Vehicle = DataType<{
 *   Bike: { wheelSize: number },
 *   Unicycle: { year: number, wheelSize: number },
 *   Car: { color: 'red' | 'blue' }
 * }>;
 */
export type DataType<
  T extends { [K in keyof T]: any },
  Tag extends string = 'variant'
> = {
  [K in keyof T]: K extends string ? T[K] extends Record<string, any> ? Variant<K, Tag, T[K]> : Variant<K, Tag, { [WRAPPED_VALUE_KEY]: T[K] }> : never
}[keyof T];

/**
 * Returns the type of the variant named `Name` in the data-type `T`
 */
export type VariantOf<
  T extends Variant<string, Tag>,
  Name extends T[Tag],
  Tag extends string = 'variant'
> = T & Variant<Name, Tag>;

/**
 * Returns the union of the return types of every function in `T`
 */
type Ret<T> = {
  [K in keyof T]: T[K] extends (...args: any) => infer R ? R : never
}[keyof T];

type CaseArg<T extends Record<string, any>, Tag extends string> = IsWrappedValue<Omit<T, Tag>> extends true ? T[WrappedValueKey] : T;

/**
 * Maps each variant of `DT` to an handler function returning `R`
 */
type Cases<DT extends Variant<string, Tag>, R, Tag extends string> = {
  [V in DT[Tag]]: (arg: CaseArg<DT & Variant<V, Tag>, Tag>) => R
};

/**
 * Same as `Cases` but accepting an optional default handler '_'
 */
type CasesWithDefault<T extends Variant<string, Tag>, Tag extends string, R = any> =
  Cases<T, R, Tag> | (Partial<Cases<T, R, Tag>> & { _: (val: T) => R });

/**
 * @param value A variant of data-type `DT`
 * @param cases An object mapping each variant name to a handler function
 * @param tag the variant tag used in DT's definition
 * @returns The result of calling the function associated to `value`'s variant with `value`
 * @example
* type Vehicle = DataType<{
*   Bike: { wheelSize: number },
*   Unicycle: { year: number, wheelSize: number },
*   Car: { color: 'red' | 'blue' }
* }>;
* 
* const vehicleComment = (vehicle: Vehicle) => match(vehicle, {
*   Bike: () => `I don't use my bike very often nowadays`,
*   Unicycle: ({ year, wheelSize }) => {
*     return `I received my unicycle in ${year}, it has a wheel of ${wheelSize} inches in diameter`
*   },
*   _: ({ variant: vehicleName }) => `I do not own a ${vehicleName}`
* });
 */
export const match = <
  DT extends Variant<string, Tag>,
  M extends CasesWithDefault<DT, Tag>,
  Tag extends string = 'variant',
>(
  value: DT,
  cases: M,
  tag: Tag = 'variant' as Tag
): Ret<M> => {
  if (value[tag] in cases) {
    const handler = (cases as Record<string, (arg: any) => Ret<M>>)[value[tag]];
    return handler(WRAPPED_VALUE_KEY in value ? value[WRAPPED_VALUE_KEY] : value);
  }

  if ('_' in cases) {
    return cases['_'](WRAPPED_VALUE_KEY in value ? value[WRAPPED_VALUE_KEY] as any : value);
  }

  throw new Error(`Unhandled ${tag}: '${value[tag]}'`);
};

type VariantNames<DTs, Tag extends string, Acc extends string[] = []> =
  DTs extends [] ? Acc :
  DTs extends [infer DT extends Variant<string, Tag>, ...infer Tail] ?
  VariantNames<Tail, Tag, [...Acc, DT[Tag]]> : never;

type JoinStrings<Strs, Acc extends string = ''> =
  Strs extends [] ? Acc :
  Strs extends [infer S extends string] ? `${Acc}${S}` :
  Strs extends [infer S extends string, ...infer Tail] ? JoinStrings<Tail, `${S} ${Acc}`> : never;

type ManyCasesKeys<DTs extends readonly Variant<string, Tag>[], Tag extends string> = JoinStrings<VariantNames<DTs, Tag>>;

type Split<S extends string, Sep extends string, Acc extends string[] = []> =
  S extends `${infer H}${Sep}${infer Tail}` ? Split<Tail, Sep, [...Acc, H]> : [...Acc, S];

type Zip<As extends readonly any[], Bs extends readonly any[], Acc extends [any, any][] = []> =
  As extends [] ? Acc :
  Bs extends [] ? Acc :
  As extends [infer A, ...infer As] ? Bs extends [infer B, ...infer Bs] ? Zip<As, Bs, [...Acc, [A, B]]> : never : never;

type VariantsOf<DTs extends readonly any[], Names extends string[], Tag extends string> =
  VariantsOfAux1<Zip<DTs, Names>, Tag>;

type VariantsOfAux1<T extends [any, any][], Tag extends string> =
  T extends [Variant<string, Tag>, string][] ? VariantsOfAux2<T, Tag> : never;

type VariantsOfAux2<T, Tag extends string, Acc extends any[] = []> =
  T extends [] ? Acc :
  T extends [[infer DT extends Variant<string, Tag>, infer Name], ...infer Tail] ?
  Name extends DT[Tag] ? VariantsOfAux2<Tail, Tag, [...Acc, VariantOf<DT, Name, Tag>]> : Acc : Acc;

type MapCaseArgs<DTs extends readonly any[], Tag extends string> =
  DTs extends [infer Head extends Record<string, any>, ...infer Tail extends any[]]
  ? [CaseArg<Head, Tag>, ...MapCaseArgs<Tail, Tag>] : [];

/**
 * Maps each variant of `DTs` to a handler function returning `R`
 */
type ManyCases<DTs extends readonly Variant<string, Tag>[], Tag extends string, R = any> = {
  [V in ManyCasesKeys<DTs, Tag>]: ((...args: MapCaseArgs<VariantsOf<DTs, Split<V, ' '>, Tag>, Tag>) => R)
};

type ManyCasesWithDefault<DTs extends readonly Variant<string, Tag>[], Tag extends string, R = any> =
  ManyCases<DTs, Tag, R> | (Partial<ManyCases<DTs, Tag, R>> & { _: (...values: DTs) => R });

/**
* @param values A tuple of data-types
* @param cases An object mapping each variant combination to a handler function
 * @param tag the variant tag used in DTs' definitions
* @returns The result of calling the function associated to the respective variants with `values`
* @example
* type List = DataType<{
*   Nil: {},
*   Cons: { head: number, tail: List }
* }>;
* 
* const same = <T>(a: List<T>, b: List<T>): boolean => matchMany([a, b], {
*   'Nil Nil': () => true,
*   'Cons Cons': (l, r) => l.head === r.head && same(l.tail, r.tail),
*   _: () => false,
* });
*/
export const matchMany = <
  DTs extends readonly Variant<string, Tag>[],
  Cases extends ManyCasesWithDefault<DTs, Tag>,
  Tag extends string = 'variant'
>(values: [...DTs], cases: Cases, tag: Tag = 'variant' as Tag): Ret<Cases> => {
  const key = values.map(v => v[tag]).join(' ');
  const vals = values.map(v => WRAPPED_VALUE_KEY in v ? v[WRAPPED_VALUE_KEY] : v);

  if (key in cases) {
    return (cases as Record<string, (...args: any[]) => Ret<Cases>>)[key](...vals);
  }

  if ('_' in cases) {
    return (cases as Record<'_', any>)['_'](...vals);
  }

  throw new Error(`Unhandled ${tag}: '${key}'`);
};

type VariantConstructorArg<T extends Record<string, any>, Tag extends string> = IsWrappedValue<Omit<T, Tag>> extends true ?
  T[WrappedValueKey] : Omit<T, Tag>;

type IsEmptyRecord<T> = keyof T extends never ? true : false;

type VariantConstructor<
  T extends Variant<string, Tag>,
  Name extends T[Tag],
  Tag extends string
> =
  IsEmptyRecord<Omit<VariantOf<T, Name, Tag>, Tag>> extends true ? () => VariantOf<T, Name, Tag> :
  (arg: VariantConstructorArg<VariantOf<T, Name, Tag>, Tag>) => VariantOf<T, Name, Tag>;

const constructorOf = <
  T extends Variant<string, Tag>,
  Name extends T[Tag],
  Tag extends string
>(variant: Name, tag: Tag): VariantConstructor<T, Name, Tag> => {
  return (arg?: any) => {
    if (arg === undefined) {
      return { [tag]: variant };
    }

    if (typeof arg === 'object' && arg != null && !Array.isArray(arg)) {
      return { [tag]: variant, ...arg };
    }

    return { [tag]: variant, [WRAPPED_VALUE_KEY]: arg };
  };
};

type VariantConstructors<
  T extends Variant<string, Tag>,
  Names extends T[Tag],
  Tag extends string
> = {
    [V in Names]: VariantConstructor<VariantOf<T, V, Tag>, VariantOf<T, V, Tag>[Tag], Tag>
  };

type ElementType<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

/**
 * Generates default variant constructors for data-type `DT`
 * @example 
 * type Vehicle = DataType<{
 *     Bike: { wheelSize: number },
 *     Unicycle: { year: number, wheelSize: number },
 *     Car: { color: 'red' | 'blue' }
 * }>;
 * 
 * const { Bike, Unicycle } = constructors<Vehicle>().get('Bike', 'Unicycle');
 * 
 * const uni = Unicycle({ year: 2017, wheelSize: 36 });
 * 
 */
export const constructors = <
  DT extends Variant<string, Tag>,
  Tag extends string = 'variant',
>(tag = 'variant' as Tag) => {
  return {
    get: <const Variants extends readonly DT[Tag][]>(...variants: Variants) => {
      type Ctors = VariantConstructors<DT, ElementType<Variants>, Tag>;
      const ctors: Partial<Ctors> = {};
    
      for (const variant of variants) {
        /// @ts-ignore
        ctors[variant] = constructorOf<DT>(variant, tag);
      }
    
      return ctors as Ctors;
    },
    getOne: <const Variant extends DT[Tag]>(variant: Variant) => {
      return constructorOf<DT, Variant, Tag>(variant, tag);
    },
  };
};
