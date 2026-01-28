import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { verifyFirebaseToken } from '../../auth/verifyFirebaseToken';
import { requireLlcAccess } from '../../auth/requireLlcAccess';
import { collections, db } from '../../firebase/admin';
import { getStripe } from '../../stripe/stripe';

const createIntentSchema = z.object({
  llcId: z.string().min(1),
  leaseId: z.string().min(1),
  tenantId: z.string().min(1),
  chargeIds: z.array(z.string()).min(1),
  amountCents: z.number().positive(),
  currency: z.string().default('usd'),
});

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function jsonResponse<T>(res: any, status: number, body: ApiResponse<T>) {
  res.status(status).json(body);
}

export const createPaymentIntent = onRequest(
  { cors: true },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      return jsonResponse(res, 405, {
        ok: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
      });
    }

    // Verify authentication
    const user = await verifyFirebaseToken(req);
    if (!user) {
      return jsonResponse(res, 401, {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
    }

    // Validate request body
    const parseResult = createIntentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonResponse(res, 400, {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Invalid request body' },
      });
    }

    const { llcId, leaseId, tenantId, chargeIds, currency } = parseResult.data;

    try {
      // Verify LLC membership
      const member = await requireLlcAccess(user.uid, llcId);
      if (!member) {
        return jsonResponse(res, 403, {
          ok: false,
          error: { code: 'PERMISSION_DENIED', message: 'No access to this LLC' },
        });
      }

      // Verify tenant can only pay their own charges
      if (member.role === 'tenant') {
        const tenantDoc = await collections.tenants(llcId).doc(tenantId).get();
        if (!tenantDoc.exists || tenantDoc.data()?.userId !== user.uid) {
          return jsonResponse(res, 403, {
            ok: false,
            error: { code: 'PERMISSION_DENIED', message: 'Cannot pay charges for another tenant' },
          });
        }
      }

      // Get LLC for Stripe connected account
      const llcDoc = await collections.llcs().doc(llcId).get();
      if (!llcDoc.exists) {
        return jsonResponse(res, 404, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'LLC not found' },
        });
      }
      const llc = llcDoc.data();
      const connectedAccountId = llc?.stripeConnectedAccountId;

      // Compute authoritative amount from open charges
      let totalAmountCents = 0;
      const chargeRefs = chargeIds.map((id) => collections.charges(llcId).doc(id));
      const chargeDocs = await db.getAll(...chargeRefs);

      for (const doc of chargeDocs) {
        if (!doc.exists) {
          return jsonResponse(res, 400, {
            ok: false,
            error: { code: 'INVALID_CHARGE', message: `Charge ${doc.id} not found` },
          });
        }
        const charge = doc.data();
        if (charge?.status !== 'open') {
          return jsonResponse(res, 400, {
            ok: false,
            error: { code: 'INVALID_CHARGE', message: `Charge ${doc.id} is not open` },
          });
        }
        if (charge?.leaseId !== leaseId) {
          return jsonResponse(res, 400, {
            ok: false,
            error: { code: 'INVALID_CHARGE', message: `Charge ${doc.id} does not belong to lease` },
          });
        }
        totalAmountCents += charge.amount;
      }

      // Create payment record in Firestore
      const paymentRef = collections.payments(llcId).doc();
      const paymentId = paymentRef.id;

      // Create Stripe PaymentIntent
      const stripe = getStripe();
      const paymentIntentParams: any = {
        amount: totalAmountCents,
        currency,
        metadata: {
          paymentId,
          llcId,
          leaseId,
          tenantId,
          chargeIds: chargeIds.join(','),
        },
        payment_method_types: ['us_bank_account', 'card'], // ACH first, then card
      };

      // If LLC has connected account, use destination charges
      if (connectedAccountId) {
        paymentIntentParams.transfer_data = {
          destination: connectedAccountId,
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      // Save payment record
      await paymentRef.set({
        leaseId,
        tenantId,
        amount: totalAmountCents,
        currency,
        status: 'requires_payment_method',
        stripePaymentIntentId: paymentIntent.id,
        appliedTo: chargeIds.map((id) => ({ chargeId: id, amount: 0 })), // Will be updated on success
        createdAt: new Date(),
      });

      return jsonResponse(res, 200, {
        ok: true,
        data: {
          paymentId,
          stripePaymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amountCents: totalAmountCents,
          currency,
        },
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return jsonResponse(res, 500, {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create payment intent' },
      });
    }
  }
);
