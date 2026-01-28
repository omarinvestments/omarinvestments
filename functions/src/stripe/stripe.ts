import Stripe from 'stripe';
import { getEnv } from '../config/env';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const env = getEnv();
  stripeInstance = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: true,
  });

  return stripeInstance;
}
