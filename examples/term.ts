import { DataType, genConstructors, match } from "..";

// A term is either a variable or a function
type Term = DataType<{
  Var: { name: string },
  Fun: { name: string, args: Term[] }
}>;

// generate constructors for Var and Fun
const { Var, Fun } = genConstructors<Term>()('Var', 'Fun');

const showTerm = (term: Term): string => match(term, {
  Var: ({ name }) => name,
  Fun: ({ name, args }) => `${name}(${args.map(showTerm).join(', ')})`
});

// Add(a, b)
console.log(showTerm(Fun({ name: 'Add', args: [Var({ name: 'a' }), Var({ name: 'b' })] })));