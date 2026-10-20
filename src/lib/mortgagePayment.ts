// THE MORTGAGE PAYMENT BOX AND THE PAYMENT THE PROFILE KEEPS ARE ONE LIMIT. The payment is stored A MONTH (`monthlyPayment`) whatever the frequency
// the person types in, and the schema (lib/schema.ts) keeps no more than 1 000 000 $ a month: a box that took 1 000 000 a WEEK stored 4,3 M$ a month,
// and a refused figure stops every save after it. `mortgagePayment.test.ts` holds this constant to what the schema accepts and refuses.

/** The largest monthly payment the profile keeps (lib/schema.ts, `household.home.mortgage.monthlyPayment`). */
export const MAX_MONTHLY_PAYMENT = 1_000_000

/** The largest payment the box takes when it is typed at `perYear` payments a year: MAX_MONTHLY_PAYMENT a month, in that unit, to the cent below. */
export const maxPaymentPer = (perYear: number): number => Math.floor(((MAX_MONTHLY_PAYMENT * 12) / perYear) * 100) / 100
