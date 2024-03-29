import { DataType, match, VariantOf, constructors, matchMany } from '..';

// Simple evaluator for an extension of the lambda calculus

// describe a Value type by providing 
// the names and arguments for every variant
type Value = DataType<{
  Num: number,
  Bool: boolean,
  Nil: {},
  Cons: { head: Value, tail: Value },
  Closure: { arg: string, body: Expr, env: Env },
  RecClosure: { name: string, arg: string, body: Expr, env: Env },
}>;

type BinaryOperator =
  'plus' | 'minus' | 'times' | 'divide' | 'mod' |
  'lss' | 'leq' | 'gtr' | 'geq' | 'eq' | 'neq' | 'cons';

type Expr = DataType<{
  Const: { value: Value },
  MonOp: { op: 'neg' | 'not', expr: Expr },
  BinOp: { op: BinaryOperator, left: Expr, right: Expr },
  Var: string,
  LetIn: { arg: string, valExpr: Expr, inExpr: Expr },
  If: { condExpr: Expr, thenExpr: Expr, elseExpr: Expr },
  Lambda: { arg: string, body: Expr },
  App: { left: Expr, right: Expr },
  LetRecIn: { name: string, arg: string, body: Expr, inExpr: Expr }
}>;

// generate constructors for all the needed variants

const { Bool, Num, Closure, RecClosure, Cons, Nil } = constructors<Value>().get(
  'Bool', 'Num', 'Nil', 'Cons', 'Closure', 'RecClosure',
);

const {
  BinOp, Var,
  If, Lambda, App, LetRecIn
} = constructors<Expr>().get(
  'MonOp', 'BinOp', 'Var', 'LetIn', 'If', 'Lambda', 'App', 'LetRecIn',
);

const Const = (value: Value): Expr => ({ variant: 'Const', value });

// an environment is a mapping from variable names to values
type Env = { [K in string]: Value };

// extract a Num from an expression, throw otherwise
const numOf = (expr: Expr, env: Env): number => {
  const v = evaluate(expr, env);

  if (v.variant === 'Num') {
    return v.$value;
  }

  throw new Error(`Expected an Num, got: ${v.variant}`);
};

// extract a boolean from an expression, throw otherwise
const boolOf = (expr: Expr, env: Env): boolean => {
  const v = evaluate(expr, env);

  if (v.variant === 'Bool') {
    return v.$value;
  }

  throw new Error(`Expected a Bool, got: ${v.variant}`);
};

/**
 * utilify function to wrap the result of a binary operator
 * accepting two numerical expressions
 * into a NumVal
 */
const numBinOp = (
  op: (a: number, b: number) => number,
  env: Env,
  left: Expr,
  right: Expr
): Value => {
  return Num(op(numOf(left, env), numOf(right, env)));
};

const boolBinOp = (
  op: (a: number, b: number) => boolean,
  env: Env,
  left: Expr,
  right: Expr
): Value => {
  return Bool(op(numOf(left, env), numOf(right, env)));
};

const valuesEq = (a: Value, b: Value): boolean => matchMany([a, b], {
  'Num Num': (n, m) => n === m,
  'Bool Bool': (q, r) => q === r,
  'Nil Nil': () => true,
  'Cons Cons': (c, d) => valuesEq(c.head, d.head) && valuesEq(c.tail, d.tail),
  _: () => false
});

/**
 * evaluates `expr` in `env`,
 * throws when a runtime error occurs
 */
const evaluate = (expr: Expr, env: Env): Value => match(expr, {
  Const: ({ value }) => value,
  MonOp: ({ op, expr }) => {
    switch (op) {
      case 'neg': return Num(-numOf(expr, env));
      case 'not': return Bool(!boolOf(expr, env));
    }
  },
  BinOp: ({ op, left, right }) => {
    switch (op) {
      case 'plus': return numBinOp((a, b) => a + b, env, left, right);
      case 'minus': return numBinOp((a, b) => a - b, env, left, right);
      case 'times': return numBinOp((a, b) => a * b, env, left, right);
      case 'divide': return numBinOp((a, b) => a / b, env, left, right);
      case 'mod': return numBinOp((a, b) => a % b, env, left, right);
      case 'lss': return boolBinOp((a, b) => a < b, env, left, right);
      case 'leq': return boolBinOp((a, b) => a <= b, env, left, right);
      case 'gtr': return boolBinOp((a, b) => a > b, env, left, right);
      case 'geq': return boolBinOp((a, b) => a >= b, env, left, right);
      case 'eq': return Bool(valuesEq(evaluate(left, env), evaluate(right, env)));
      case 'neq': return Bool(!valuesEq(evaluate(left, env), evaluate(right, env)));
      case 'cons': return Cons({ head: evaluate(left, env), tail: evaluate(right, env) });
    }
  },
  Var: name => {
    if (name in env) {
      return env[name];
    }

    throw new Error(`variable '${name}' is not defined`);
  },
  LetIn: ({ arg, valExpr, inExpr }) => {
    const newEnv = { ...env, [arg]: evaluate(valExpr, env) };
    return evaluate(inExpr, newEnv);
  },
  If: ({ condExpr, thenExpr, elseExpr }) => evaluate(boolOf(condExpr, env) ? thenExpr : elseExpr, env),
  Lambda: ({ arg, body }) => Closure({ arg, body, env: { ...env } }),
  App: ({ left, right }) => {
    const v = evaluate(right, env);

    const f: VariantOf<Value, 'Closure'> = match(evaluate(left, env), {
      Closure: f => f,
      RecClosure: ({ name, arg, body, env }) => {
        let recVal = RecClosure({ name, arg, body, env });
        return Closure({ arg, body, env: { ...env, [name]: recVal } });
      },
      _: ({ variant }) => { throw new Error(`Expected a closure, got: '${variant}'`); }
    });


    const argEnv = { ...f.env, [f.arg]: v };
    return evaluate(f.body, argEnv);
  },
  LetRecIn: ({ name, arg, body, inExpr }) => {
    const newEnv = {
      ...env,
      [name]: RecClosure({ name, arg, body: body, env })
    };

    return evaluate(inExpr, newEnv);
  }
});

// to test our small evaluator, we can build some recursive functions
// and evaluate the expressions in the empty env 

const factorial = (n: number) => LetRecIn({
  name: 'f',
  arg: 'n',
  body: If({
    condExpr: BinOp({
      left: Var('n'), op: 'eq', right: Const(Num(0))
    }),
    thenExpr: Const(Num(1)),
    elseExpr: BinOp({
      left: Var('n'),
      op: 'times',
      right: App({
        left: Var('f'),
        right: BinOp({
          left: Var('n'),
          op: 'minus',
          right: Const(Num(1))
        })
      })
    })
  }),
  inExpr: App({ left: Var('f'), right: Const(Num(n)) })
});

const listPrimes = (upTo: number) => LetRecIn({
  name: 'listPrimes',
  arg: 'i',
  body: Lambda({
    arg: 'acc',
    body: If({
      condExpr: BinOp({ left: Var('i'), op: 'gtr', right: Const(Num(0)) }),
      thenExpr: App({
        left: App({
          left: Var('listPrimes'),
          right: BinOp({
            left: Var('i'),
            op: 'minus',
            right: Const(Num(1))
          })
        }),
        right: If({
          condExpr: LetRecIn({
            name: 'isPrime',
            arg: 'n',
            body: Lambda({
              arg: 'i',
              body: If({
                condExpr: BinOp({ left: Var('n'), op: 'lss', right: Const(Num(2)) }),
                thenExpr: Const(Bool(false)),
                elseExpr: If({
                  condExpr: BinOp({ left: Var('n'), op: 'eq', right: Const(Num(2)) }),
                  thenExpr: Const(Bool(true)),
                  elseExpr: If({
                    condExpr: BinOp({
                      left: BinOp({ left: Var('n'), op: 'mod', right: Const(Num(2)) }),
                      op: 'eq',
                      right: Const(Num(0))
                    }),
                    thenExpr: Const(Bool(false)),
                    elseExpr: If({
                      condExpr: BinOp({
                        left: BinOp({ left: Var('i'), op: 'times', right: Var('i') }),
                        op: 'leq',
                        right: Var('n')
                      }),
                      thenExpr: If({
                        condExpr: BinOp({
                          left: BinOp({ left: Var('n'), op: 'mod', right: Var('i') }),
                          op: 'eq',
                          right: Const(Num(0))
                        }),
                        thenExpr: Const(Bool(false)),
                        elseExpr: App({
                          left: App({ left: Var('isPrime'), right: Var('n') }),
                          right: BinOp({
                            left: Var('i'),
                            op: 'plus',
                            right: Const(Num(2))
                          })
                        })
                      }),
                      elseExpr: Const(Bool(true))
                    })
                  })
                })
              })
            }),
            inExpr: App({
              left: App({ left: Var('isPrime'), right: Var('i') }),
              right: Const(Num(3))
            })
          }),
          thenExpr: BinOp({ op: 'cons', left: Var('i'), right: Var('acc') }),
          elseExpr: Var('acc')
        })
      }),
      elseExpr: Var('acc')
    })
  }),
  inExpr: App({
    left: App({ left: Var('listPrimes'), right: Const(Num(upTo)) }),
    right: Const(Nil())
  })
});

/**
 * converts a Cons Value into an array of values
 */
const arrayOf = ({ head, tail }: VariantOf<Value, 'Cons'>): Value[] => match(tail, {
  Nil: () => [head],
  Cons: list => [head, ...arrayOf(list)],
  _: ({ variant }) => { throw new Error(`Cannot call 'arrayOf' on a '${variant}'`) }
});

/**
 * formats a value into a string
 */
const showValue = (val: Value): string => match(val, {
  Num: n => `${n}`,
  Bool: q => q ? 'True' : 'False',
  Nil: () => '[]',
  Closure: ({ arg: x }) => `\\${x} -> <...>`,
  RecClosure: ({ name: f, arg: x }) => `let rec ${f} ${x} -> <...>`,
  Cons: list => `[${arrayOf(list).map(showValue).join(', ')}]`
});

console.log(`9! = ${showValue(evaluate(factorial(9), {}))}`);
console.log(`primes <= 1000: ${showValue(evaluate(listPrimes(1000), {}))}`);