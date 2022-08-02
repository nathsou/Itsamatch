import { DataType, genConstructors, match, matchMany } from "..";

type List<T> = DataType<{
  Nil: {},
  Cons: { head: T, tail: List<T> }
}>;

const { Nil, Cons } = genConstructors<List<number>>(['Nil', 'Cons']);

const len = <T>(list: List<T>): number => match(list, {
  Nil: () => 0,
  Cons: ({ tail }) => 1 + len(tail)
});

const same = <T>(a: List<T>, b: List<T>): boolean => matchMany([a, b], {
  'Nil Nil': () => true,
  'Cons Cons': (l, r) => l.head === r.head && same(l.tail, r.tail),
  _: () => false,
});

console.log(len(Cons({ head: 1, tail: Cons({ head: 2, tail: Nil({}) }) }))); // 2
console.log(same(Nil({}), Nil({}))); // true
console.log(same(Cons({ head: 1, tail: Nil({}) }), Nil({}))); // false
