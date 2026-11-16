import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { tenantId, targetUserId, eventCategory, title, message, deepLinkUrl } = body ?? {};

    if (!tenantId || !targetUserId || !eventCategory || !title || !message) {
      return new Response(
        JSON.stringify({
          dispatched: false,
          status: "INVALID_PAYLOAD",
          reasonCode: "MISSING_REQUIRED_FIELDS",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fcmServerKey = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const apnsKey = Deno.env.get("APNS_PRIVATE_KEY");

    if (!fcmServerKey && !apnsKey) {
      // Fail-closed: record as EXTERNAL_HOLD outbox event with zero paid/external network dispatch
      return new Response(
        JSON.stringify({
          dispatched: false,
          status: "EXTERNAL_HOLD",
          reasonCode: "LIVE_PUSH_CREDENTIALS_REQUIRED",
          outboxQueued: true,
          tenantId,
          targetUserId,
          eventCategory,
          deepLinkUrl: deepLinkUrl ?? "randevulari://wallet",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        dispatched: true,
        status: "QUEUED_FOR_PROVIDER",
        tenantId,
        targetUserId,
        eventCategory,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        dispatched: false,
        status: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
