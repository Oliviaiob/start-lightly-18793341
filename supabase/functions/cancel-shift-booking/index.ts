import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { shift_id, booking_id } = await req.json();
    if (!shift_id || !booking_id) {
      return new Response(JSON.stringify({ error: "shift_id and booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get shift details + client name
    const { data: shift } = await supabase
      .from("temp_shifts")
      .select("candidate_id, shift_date, client_id, clients(company_name)")
      .eq("id", shift_id)
      .single();

    if (!shift) {
      return new Response(JSON.stringify({ error: "Shift not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateId = shift.candidate_id;
    const shiftDate: string = shift.shift_date;
    const clientName = (shift.clients as any)?.company_name ?? "the client";

    const dateLabel = new Date(shiftDate + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long",
    });

    // Cancel the app-side shift_offer if a candidate was assigned
    if (candidateId) {
      const shiftDateObj = new Date(shiftDate + "T00:00:00");
      const hoursUntilShift = (shiftDateObj.getTime() - Date.now()) / (1000 * 60 * 60);
      const within24h = hoursUntilShift >= 0 && hoursUntilShift < 24;

      await supabase
        .from("shift_offers")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_within_24h: within24h,
        })
        .eq("booking_group_id", booking_id)
        .eq("candidate_id", candidateId)
        .eq("shift_date", shiftDate);

      // Also cancel their shortlist entry
      await supabase
        .from("shift_shortlist")
        .update({ status: "cancelled" })
        .eq("shift_id", shift_id)
        .eq("candidate_id", candidateId);

      // Write in-app notification
      await supabase.from("candidate_notifications").insert({
        candidate_id: candidateId,
        type: "shift_cancelled",
        title: "Shift Cancelled",
        body: `Your shift on ${dateLabel} at ${clientName} has been cancelled.`,
        link_to: "/shifts",
        read: false,
      });

      // FCM push notification
      const firebaseKey = Deno.env.get("FIREBASE_SERVER_KEY");
      if (firebaseKey) {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token")
          .eq("candidate_id", candidateId);

        if (tokens && tokens.length > 0) {
          for (const { token } of tokens) {
            await fetch("https://fcm.googleapis.com/fcm/send", {
              method: "POST",
              headers: {
                "Authorization": `key=${firebaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: token,
                notification: {
                  title: "Shift Cancelled",
                  body: `Your shift on ${dateLabel} at ${clientName} has been cancelled.`,
                },
                data: { type: "shift_cancelled", link_to: "/shifts" },
              }),
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
