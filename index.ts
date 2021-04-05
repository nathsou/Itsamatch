/**
 * Defines a data-type variant named `Name` and constructed with `Props`
 */
export type Variant<Name extends string, Props extends Record<string, any> = {}> = { variant: Name } & Props;

/**
 * Maps each property in `T` to a Variant constructed with the associated type
 * @example
 * type Vehicle = DataType<{
 *     Bike: { wheelSize: number },
 *     Unicycle: { year: number, wheelSize: number },
 *     Car: { color: 'red' | 'blue' }
 * }>;
 */
export type DataType<T extends { [K in keyof T]: Record<string, any> }> = {
    [K in keyof T]: K extends string ? Variant<K, T[K]> : never
}[keyof T];

/**
 * Returns the type of the variant named `Name` in the data-type `T`
 */
export type VariantOf<T extends Variant<string>, Name extends T['variant']> = T & Variant<Name>;

/**
 * Returns the union of the return types of every function in `T`
 */
type Ret<T> = {
    [K in keyof T]: T[K] extends (...args: any) => infer R ? R : never
}[keyof T];

/**
 * Maps each variant of `DT` to a handler function returning `R`
 */
type Cases<DT extends Variant<string>, R> = {
    [V in DT['variant']]: ((args: {
        [K in keyof (DT & Variant<V>)]: (DT & Variant<V>)[K]
    }) => R)
};

/**
 * Same as `Cases` but accepting an optional default handler '_'
 */
type CasesWithDefault<T extends Variant<string>, R = any> =
    Cases<T, R> | (Partial<Cases<T, R>> & { _: (val: T) => R });

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
export const match = <DT extends Variant<string>, M extends CasesWithDefault<DT>>(
    val: DT,
    cases: M
): Ret<M> => {
    if (cases.hasOwnProperty(val.variant)) {
        const handler = (cases as Record<string, (arg: DT) => Ret<M>>)[val.variant];
        return handler(val);
    }

    const defaultHandler = (cases as Record<'_', (arg: DT) => Ret<M>>)['_'];
    return defaultHandler(val);
};

type VariantConstructor<T extends Variant<string>, Name extends T['variant']> =
    (args: Omit<VariantOf<T, Name>, 'variant'>) => VariantOf<T, Name>;

const constructorOf = <
    T extends Variant<string>,
    Name extends T['variant']
>(variant: Name) => {
    return (args => ({
        variant,
        ...args
    })) as VariantConstructor<VariantOf<T, Name>, Name>;
};

type VariantConstructors<T extends Variant<string>, Names extends string> = {
    [V in Names]: VariantConstructor<VariantOf<T, V>, V>
};

/**
 * Generates a default variant constructor factory for data-type `DT` that accepts a list of variant names
 * @example 
 * type Vehicle = DataType<{
 *     Bike: { wheelSize: number },
 *     Unicycle: { year: number, wheelSize: number },
 *     Car: { color: 'red' | 'blue' }
 * }>;
 * 
 * const ctorFactory = genConstructors<Vehicle>();
 * const { Bike, Unicycle } = ctorFactory('Bike', 'Unicycle');
 * 
 * const uni = Unicycle({ year: 2017, wheelSize: 36 });
 * 
 */
export const genConstructors = <DT extends Variant<string>>() =>
    <Variants extends DT['variant']>(...variants: Variants[]): VariantConstructors<DT, Variants> => {
        type R = VariantConstructors<DT, Variants>;
        return variants.reduce<R>((ctors, variant) => {
            /// @ts-ignore
            ctors[variant] = constructorOf<DT>(variant);
            return ctors;
        }, {} as R);
    };