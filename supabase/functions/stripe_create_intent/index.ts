import {
  createEphemeralKey,
  createPaymentIntent,
  STRIPE_PUBLISHABLE_KEY,
} from "../_utils/stripe.ts";

import {
  createOrRetrieveStripeCustomerId,
  getDbUser,
} from "../_utils/supabase.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const user = await getDbUser(req);
    const reqBody = await req.json();

    const { productId } = reqBody as {
      productId: "monthly" | "lifetime" | "early_access";
    };

    const customerId = await createOrRetrieveStripeCustomerId(user);
    const ephemeralKey = await createEphemeralKey(customerId);
    const paymentIntentClientSecret = await createPaymentIntent(
      customerId,
      productId,
    );

    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntentClientSecret,
        ephemeralKey: ephemeralKey,
        customer: customerId,
        publishableKey: STRIPE_PUBLISHABLE_KEY,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
    });
  }
});
