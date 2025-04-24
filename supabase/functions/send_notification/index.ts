import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const dbUrl = Deno.env.get("SUPABASE_URL") as string;
const dbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN") as string;

interface ExpoMessage {
    to: string | string[];
    title: string;
    body: string;
    data?: Record<string, any>;
  }

Deno.serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        const { cron } = await req.json();

        if (!cron || cron !== "authorized-cron-job-4242!") {
            return new Response("Unauthorized", { status: 401 });
        }

        // Create a Supabase client with the service role key
        const supabase = createClient(dbUrl, dbKey);
        
        // Get current time in the format stored in your database
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        
        // Format time for comparison with database (assuming format like "14:30")
        // Possible add check for missed cron jobs in last 5 min
        const formattedTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        console.log("Current time in UTC:", formattedTime);
        
        // Query profiles that should receive notifications now
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, expo_push_token, notification_time')
          .eq('notification_time', formattedTime)


        console.log("Fetched profiles:", profiles);
        
        if (error) {
            console.error("Error fetching profiles:", error);
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { headers: { "Content-Type": "application/json" }, status: 500 }
            );
        }
        
        if (profiles && profiles.length > 0) {
            const messages: ExpoMessage[] = profiles.map(profile => ({
                to: profile.expo_push_token,
                title: "Snowball",
                body: 'Track your habits! ❄️',
            }));
            try {
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${expoAccessToken}`,
                    },
                    body: JSON.stringify(messages), // Send the entire array
                });

                const result = await response.json();
                console.log("Notification result:", result);
            } catch (error) {
                console.error("Error sending notifications:", error);
            }


            return new Response(
                JSON.stringify({
                    success: true,
                    notificationsSent: profiles.length,
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }
        
        return new Response(
          JSON.stringify({ success: true, result: "No notifications to send at this time." }),
          { headers: { "Content-Type": "application/json" } }
        );
      // deno-lint-ignore no-explicit-any
      } catch (error: any) {
        console.error("Error in send_notifications function:", error);

        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { "Content-Type": "application/json" }, status: 500 }
        );
      }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send_notifcations' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
