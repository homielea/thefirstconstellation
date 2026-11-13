import { WebSearchOutput } from "@/contracts";
import { toolCostUsd } from "@/domain/pricing";
import { env } from "../env";
import { assertWithinCaps, recordLiveSpend } from "./spend-guard";
import { ProviderError, type SearchProvider } from "./types";

export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave";
  readonly mode = "live" as const;
  constructor(private apiKey = env("BRAVE_API_KEY", "")) {}

  async search(query: string, count: number, signal?: AbortSignal): Promise<WebSearchOutput> {
    // INT-002: never fabricate results when search is not connected.
    if (!this.apiKey) throw new ProviderError("connection_missing", "Web search is not connected.", false);
    await assertWithinCaps(this.name);
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("text_decorations", "false");
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": this.apiKey },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    }).catch((e) => {
      throw new ProviderError(e?.name === "TimeoutError" ? "timeout" : "model_error", "Web search could not be reached.", true, { error: String(e?.name) });
    });
    if (res.status === 401 || res.status === 403) throw new ProviderError("connection_missing", "Web search rejected the credentials.", false, { status: res.status });
    if (!res.ok) throw new ProviderError("model_error", "Web search returned an error.", res.status >= 500 || res.status === 429, { status: res.status });
    await recordLiveSpend(this.name, toolCostUsd("web.search"), "web.search");
    const body = (await res.json()) as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } };
    const results = (body.web?.results ?? [])
      .filter((r) => r.url && /^https?:\/\//.test(r.url))
      .map((r) => ({ title: (r.title ?? r.url!).slice(0, 300), url: r.url!, snippet: (r.description ?? "").replace(/<[^>]+>/g, "").slice(0, 1000) }));
    return WebSearchOutput.parse({ results });
  }
}
