import { DataType, genConstructors, match } from "..";

type List<T> = DataType<{
  Nil: {},
  Cons: { head: T, tail: List<T> }
}>;

const { Nil, Cons } = genConstructors<List<number>>(['Nil', 'Cons']);

const len = <T>(list: List<T>): number => match(list, {
  Nil: () => 0,
  Cons: ({ tail }) => 1 + len(tail)
});

const size = len(Cons({ head: 1, tail: Cons({ head: 2, tail: Nil({}) }) }));

// size is 2
console.log(size);
