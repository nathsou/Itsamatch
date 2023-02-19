import { DataType, genConstructors, match, matchMany } from "..";

// A term is either a variable or a function
type Term = DataType<{
  Var: string,
  Fun: { name: string, args: Term[] },
}>;

// generate constructors for Var and Fun
const { Var, Fun } = genConstructors<Term>(['Var', 'Fun']);

const showTerm = (term: Term): string => match(term, {
  Var: name => name,
  Fun: ({ name, args }) => `${name}(${args.map(showTerm).join(', ')})`
});

const same = (a: Term, b: Term): boolean => matchMany([a, b], {
  'Var Var': (v1, v2) => v1 === v2,
  'Fun Fun': (f1, f2) =>
    f1.name === f2.name &&
    f1.args.length === f2.args.length &&
    f1.args.every((arg1, i) => same(arg1, f2.args[i])),
  _: () => false,
});

// Add(a, b)
console.log(showTerm(Fun({ name: 'Add', args: [Var('a'), Var('b')] })));
