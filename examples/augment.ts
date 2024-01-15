import { augment } from "..";

const { Apple, Pizza, Static } = augment({
    Apple: (size: number) => ({ size }),
    Pizza: (radius: number) => ({ radius }),
    Static: { Somedata: 10 }
  },
  () => ({createdAt: new Date()})
)

console.log(Apple(10).createdAt); // = Date, ok
console.log(Pizza(10).createdAt); // = Date, ok
console.log(Static.createdAt); // type not augmented, thus createdAt is not added
