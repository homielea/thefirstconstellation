import { providerMode } from "../env";
import { AnthropicProvider } from "./anthropic";
import { BraveSearchProvider } from "./brave";
import { FakeModelProvider, FakeSearchProvider } from "./fake";
import { ProviderError, type ModelProvider, type SearchProvider } from "./types";

export interface Providers { mode: "fake" | "live"; model: ModelProvider; search: SearchProvider }

/** A provider that fails every call with the construction error (e.g. missing key), so the step shows it. */
function unavailableModel(err: ProviderError): ModelProvider {
  return { name: "unavailable", mode: "live", generateStructured: async () => { throw err; } };
}

export function createProviders(mode = providerMode()): Providers {
  if (mode === "fake") return { mode, model: new FakeModelProvider(), search: new FakeSearchProvider() };
  let model: ModelProvider;
  try { model = new AnthropicProvider(); } catch (e) { model = unavailableModel(e as ProviderError); }
  return { mode, model, search: new BraveSearchProvider() };
}
