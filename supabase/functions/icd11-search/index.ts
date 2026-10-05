import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const clientId = Deno.env.get("ICD_API_CLIENT_ID");
  const clientSecret = Deno.env.get("ICD_API_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.error("ICD API credentials are not configured.");
    return jsonResponse({ error: "The ICD-11 service is not configured." }, 503);
  }

  let query: string;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("query" in body) || typeof body.query !== "string") {
      return jsonResponse({ error: "A search query is required." }, 400);
    }
    query = body.query.trim();
  } catch {
    return jsonResponse({ error: "The request body must be valid JSON." }, 400);
  }

  if (query.length < 2 || query.length > 100) {
    return jsonResponse({ error: "Search query must contain between 2 and 100 characters." }, 400);
  }

  try {
    const tokenResponse = await fetch("https://icdaccessmanagement.who.int/connect/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "icdapi_access",
      }),
    });
    if (!tokenResponse.ok) {
      console.error("ICD token request failed with status", tokenResponse.status);
      return jsonResponse({ error: "Could not authenticate with the ICD-11 service." }, 502);
    }

    const tokenPayload: unknown = await tokenResponse.json();
    if (!tokenPayload || typeof tokenPayload !== "object" || !("access_token" in tokenPayload) || typeof tokenPayload.access_token !== "string") {
      console.error("ICD token response did not include an access token.");
      return jsonResponse({ error: "The ICD-11 service returned an invalid token response." }, 502);
    }

    const searchUrl = new URL("https://id.who.int/icd/release/11/2026-01/mms/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("useFlexisearch", "true");
    searchUrl.searchParams.set("flatResults", "true");
    searchUrl.searchParams.set("includeKeywordResult", "false");
    searchUrl.searchParams.set("highlightingEnabled", "false");
    searchUrl.searchParams.set("medicalCodingMode", "true");

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/json",
        "Accept-Language": "fr",
        "API-Version": "v2",
      },
    });
    if (!searchResponse.ok) {
      console.error("ICD search request failed with status", searchResponse.status);
      return jsonResponse({ error: "The ICD-11 search request failed." }, 502);
    }

    const searchPayload: unknown = await searchResponse.json();
    const entities =
      searchPayload && typeof searchPayload === "object" && "destinationEntities" in searchPayload
        ? searchPayload.destinationEntities
        : null;
    if (!Array.isArray(entities)) {
      console.error("ICD search response did not include destination entities.");
      return jsonResponse({ error: "The ICD-11 service returned an invalid search response." }, 502);
    }

    const results = entities.flatMap((entity) => {
      if (!entity || typeof entity !== "object") return [];
      const label = "title" in entity && typeof entity.title === "string"
        ? entity.title
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, "\"")
          .replace(/&#39;|&apos;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim()
        : "";
      const uri = "id" in entity && typeof entity.id === "string" ? entity.id : "";
      if (!label || !uri) return [];
      const sourceUrl = uri.startsWith("http://id.who.int/icd/") && !/\s/.test(uri)
        ? uri.replace(/^http:/, "https:")
        : null;
      return [{
        id: uri,
        label,
        code: "theCode" in entity && typeof entity.theCode === "string" ? entity.theCode : null,
        categoryId: "general",
        synonyms: [],
        symptomSuggestions: [],
        questions: [],
        sourceUrl,
      }];
    });

    return jsonResponse({ results: results.slice(0, 20) });
  } catch (error) {
    console.error("Unexpected ICD-11 search error:", error);
    return jsonResponse({ error: "An unexpected error occurred while searching ICD-11." }, 500);
  }
});
