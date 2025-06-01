// esm.sh is used to compile stripe-node to be compatible with ES modules.
import Stripe from "https://esm.sh/stripe@18.1.0?target=deno";

const apiVersion = "2025-03-31.basil";

export const STRIPE_PUBLISHABLE_KEY = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

export const stripe = Stripe(STRIPE_SECRET_KEY ?? "", {
    // This is needed to use the Fetch API rather than relying on the Node http
    // package.
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: apiVersion,
});

export const createEphemeralKey = async (
    customerId: string,
): Promise<string> => {
    const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: apiVersion },
    );
    return ephemeralKey.secret;
};

export const createPaymentIntent = async (
    customerId: string,
    productId: "monthly" | "lifetime" | "early_access",
): Promise<string> => {
    let paymentIntentClientSecret: string;

    if (productId === "early_access") {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 999,
            currency: "usd",
            customer: customerId,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        paymentIntentClientSecret = paymentIntent.client_secret;

        return paymentIntentClientSecret;
    }

    throw new Error(
        `Unsupported productId: ${productId}. Supported values are "monthly", "lifetime", and "early_access".`,
    );
};
