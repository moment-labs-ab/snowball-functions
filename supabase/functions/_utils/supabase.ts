import { Database } from "./db_types.ts";
import { stripe } from "./stripe.ts";
// Import Supabase client
import {
  createClient,
  User,
} from "https://esm.sh/@supabase/supabase-js@2.49.1";

// WARNING: The service role key has admin priviliges and should only be used in secure server environments!
const supabaseAdmin = createClient<Database>(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

export const getDbUser = async (req: Request): Promise<User> => {
  // Get JWT from auth header
  const authHeader = req.headers.get("Authorization")!;
  const jwt = authHeader.replace("Bearer ", "").replace("Bearer", "").trim();

  // Get the user object
  const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
  if (!user) throw new Error("No user found for JWT!");

  return user;
};

export const createOrRetrieveStripeCustomerId = async (
  user: User,
) => {
  // Check if the user already has a Stripe customer ID in the Database.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  if (data.stripe_customer_id) {
    const stripeCustomerId = data.stripe_customer_id;
    return stripeCustomerId;
  }

  // Create customer object in Stripe.
  const customer = await stripe.customers.create({
    name: data.full_name,
    email: user.email,
    metadata: { uid: user.id },
  });

  console.log(
    `New stripe customer "${customer.id}" created for user "${user.id}"`,
  );

  await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  return customer.id;
};
