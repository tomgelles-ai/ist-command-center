import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const store = getStore("ist-tracker");
    const raw = await store.get("data");
    const data = raw ? JSON.parse(raw) : { months: {} };
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ months: {} }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = { path: "/api/get-data" };
