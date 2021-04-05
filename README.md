[![NPM Package][npm]][npm-url]
[![Build Size][build-size]][build-size-url]

# It's a match!

itsamatch is a tiny set of types and utilities to define and use variants / tagged unions / sum types in a more declarative way in TypeScript.

## Usage

itsamatch exposes two functions and a few types that make it easier to construct data types.
Below is a simple example showing how it can be used to create a [linked list data type](https://en.wikipedia.org/wiki/Cons#Lists) :

```typescript
import { DataType, genConstructors, match } from 'itsamatch';

// a list is a data type with two variants:
type List<T> = DataType<{
    Nil: {},
    Cons: { head: T, tail: List<T> }
}>;

// generate default variant constructors for lists of numbers
const { Nil, Cons } = genConstructors<List<number>>()('Nil', 'Cons');

// use the match function to compute the length of a list
const len = <T>(list: List<T>): number => match(list, {
    Nil: () => 0,
    Cons: ({ tail }) => 1 + len(tail)
});

// size is 2
const size = len(Cons({ head: 1, tail: Cons({ head: 2, tail: Nil({}) }) }));
```

More examples are available in the /examples folder

[npm]: https://img.shields.io/npm/v/itsamatch
[npm-url]: https://www.npmjs.com/package/itsamatch
[build-size]: https://badgen.net/bundlephobia/minzip/itsamatch
[build-size-url]: https://bundlephobia.com/result?p=itsamatch