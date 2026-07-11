import AbacatePay from "abacatepay-nodejs-sdk";

// Server-only: never import this from a Client Component.
export const abacatepay = AbacatePay(process.env.ABACATEPAY_API_KEY!);
