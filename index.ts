/**
 * Defines a data-type variant named `Name` and constructed with `Props`
 */
export type Variant<
  Name extends string,
  Tag extends string = 'variant',
  Props extends Record<string, any> = {},
  > = { [K in Tag]: Name } & Props;

/**
 * Maps each property in `T` to a Variant constructed with the associated type
 * @example
 * type Vehicle = DataType<{
 *     Bike: { wheelSize: number },
 *     Unicycle: { year: number, wheelSize: number },
 *     Car: { color: 'red' | 'blue' }
 * }>;
 */
export type DataType<
  T extends { [K in keyof T]: Record<string, any> },
  Tag extends string = 'variant'
  > = {
    [K in keyof T]: K extends string ? Variant<K, Tag, T[K]> : never
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

/**
 * Maps each variant of `DT` to a handler function returning `R`
 */
type Cases<DT extends Variant<string, Tag>, R, Tag extends string> = {
  [V in DT[Tag]]: ((args: {
    [K in keyof (DT & Variant<V, Tag>)]: (DT & Variant<V, Tag>)[K]
  }) => R)
};

/**
 * Same as `Cases` but accepting an optional default handler '_'
 */
type CasesWithDefault<T extends Variant<string, Tag>, Tag extends string, R = any> =
  Cases<T, R, Tag> | (Partial<Cases<T, R, Tag>> & { _: (val: T) => R });

/**
 * @param val A variant of data-type `DT`
 * @param cases An object mapping each variant name to a handler function
 * @returns The result of calling the function associated to `val`'s variant with `val`
 * @example
* type Vehicle = DataType<{
*     Bike: { wheelSize: number },
*     Unicycle: { year: number, wheelSize: number },
*     Car: { color: 'red' | 'blue' }
* }>;
* 
* const vehicleComment = (vehicle: Vehicle) => match(vehicle, {
*     Bike: () => `I don't use my bike very often nowadays`,
*     Unicycle: ({ year, wheelSize }) => {
*         return `I received my unicycle in ${year}, it has a wheel of ${wheelSize} inches in diameter`
*     },
*     _: ({ variant: vehicleName }) => `I do not own a ${vehicleName}`
* });
 */
export const match = <
  DT extends Variant<string, Tag>,
  M extends CasesWithDefault<DT, Tag>,
  Tag extends string = 'variant',
  >(
    val: DT,
    cases: M,
    tag: Tag = 'variant' as Tag
  ): Ret<M> => {
  if (val[tag] in cases) {
    const handler = (cases as Record<string, (arg: DT) => Ret<M>>)[val[tag]];
    return handler(val);
  }

  const defaultHandler = (cases as Record<'_', (arg: DT) => Ret<M>>)['_'];
  return defaultHandler(val);
};

type VariantConstructor<
  T extends Variant<string, Tag>,
  Name extends T[Tag],
  Tag extends string
  > =
  (args: Omit<VariantOf<T, Name, Tag>, Tag>) => VariantOf<T, Name, Tag>;

const constructorOf = <
  T extends Variant<string, Tag>,
  Name extends T[Tag],
  Tag extends string
>(variant: Name, tag: Tag) => {
  return (args => ({
    [tag]: variant,
    ...args
  })) as VariantConstructor<VariantOf<T, Name, Tag>, VariantOf<T, Name, Tag>[Tag], Tag>;
};

type VariantConstructors<
  T extends Variant<string, Tag>,
  Names extends T[Tag],
  Tag extends string
  > = {
    [V in Names]: VariantConstructor<VariantOf<T, V, Tag>, VariantOf<T, V, Tag>[Tag], Tag>
  };

/**
 * Generates default variant constructors for data-type `DT`
 * @example 
 * type Vehicle = DataType<{
 *     Bike: { wheelSize: number },
 *     Unicycle: { year: number, wheelSize: number },
 *     Car: { color: 'red' | 'blue' }
 * }>;
 * 
 * const { Bike, Unicycle } = genConstructors<Vehicle>(['Bike', 'Unicycle']);
 * 
 * const uni = Unicycle({ year: 2017, wheelSize: 36 });
 * 
 */
export const genConstructors = <
  DT extends Variant<string, Tag>,
  Tag extends string = 'variant',
  Variants extends DT[Tag] = DT[Tag],
  >(variants: Variants[], tag = 'variant' as Tag): VariantConstructors<DT, Variants, Tag> => {
  type R = VariantConstructors<DT, Variants, Tag>;
  return variants.reduce<R>((ctors, variant) => {
    /// @ts-ignore
    ctors[variant] = constructorOf<DT>(variant, tag);
    return ctors;
  }, {} as R);
};