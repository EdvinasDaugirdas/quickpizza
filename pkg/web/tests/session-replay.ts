import { fileURLToPath } from "node:url";
import {
  type BrowserContext,
  chromium,
  type TestInfo,
  test,
} from "@playwright/test";
import { build } from "vite";

type BuildOutput = {
  output: Array<
    { type: "asset" } | { type: "chunk"; code: string; isEntry: boolean }
  >;
};

type ContextReplay = {
  testInfo: TestInfo | undefined;
  sessionIds: Set<string>;
};

let browserBundle: Promise<string> | undefined;
let installed = false;

function buildBrowserBundle(): Promise<string> {
  if (!browserBundle) {
    browserBundle = build({
      configFile: false,
      logLevel: "silent",
      build: {
        write: false,
        minify: true,
        rollupOptions: {
          input: fileURLToPath(
            new URL("./session-replay.init.js", import.meta.url),
          ),
          output: {
            format: "iife",
          },
        },
      },
    }).then((result) => {
      const output = (result as BuildOutput).output;
      const chunk = output.find(
        (item): item is Extract<(typeof output)[number], { type: "chunk" }> =>
          item.type === "chunk" && item.isEntry,
      );

      if (!chunk) {
        throw new Error("Could not build the Session Replay browser bundle");
      }

      return chunk.code;
    });
  }

  return browserBundle;
}

export function installFaro({ collectorUrl }: { collectorUrl?: string }) {
  if (!collectorUrl || installed) {
    return;
  }

  const config = {
    url: collectorUrl,
    appName:
      process.env.PLAYWRIGHT_SESSION_REPLAY_APP_NAME ?? "QuickPizza Playwright",
    appVersion: process.env.GITHUB_SHA ?? "local",
    environment: process.env.CI ? "ci" : "local",
    namespace: "quickpizza-e2e",
  };

  const contexts = new Map<BrowserContext, ContextReplay>();

  const listener = {
    async runAfterCreateBrowserContext(context: BrowserContext) {
      const bundle = await buildBrowserBundle();
      let testInfo: TestInfo | undefined;

      try {
        testInfo = test.info();
      } catch {
        // Contexts outside a test still get instrumentation, but no attachment.
      }

      const replay: ContextReplay = {
        testInfo,
        sessionIds: new Set(),
      };

      contexts.set(context, replay);

      context.on("response", (response) => {
        if (
          response.url().startsWith(collectorUrl) &&
          response.request().method() === "POST" &&
          response.ok()
        ) {
          const sessionId = response.request().headers()["x-faro-session-id"];

          if (sessionId) {
            replay.sessionIds.add(sessionId);
          }
        }
      });

      await context.addInitScript({
        content: `globalThis.__PLAYWRIGHT_SESSION_REPLAY_CONFIG__ = ${JSON.stringify(config)};\n${bundle}`,
      });
    },
    async runBeforeCloseBrowserContext(context: BrowserContext) {
      const replay = contexts.get(context);

      if (!replay) {
        return;
      }

      contexts.delete(context);

      // Replay events are buffered in the browser, so leave the page alive long
      // enough for the final chunk to reach the collector before teardown.
      await new Promise((resolve) => setTimeout(resolve, 5_000));

      if (replay.testInfo && replay.sessionIds.size > 0) {
        await replay.testInfo.attach("session-replay", {
          contentType: "application/json",
          body: Buffer.from(
            JSON.stringify({ sessionIds: [...replay.sessionIds] }),
          ),
        });
      }
    },
  };

  // Private Playwright API, verified with the pinned 1.63.0 dependency. The
  // client instrumentation is shared by all three browser types. Workers load
  // this config independently and await the listener before returning a context.
  const instrumentation = (
    chromium as typeof chromium & {
      _instrumentation?: { addListener(value: typeof listener): void };
    }
  )._instrumentation;

  if (!instrumentation?.addListener) {
    throw new Error(
      "This Playwright version does not support the Faro lifecycle adapter",
    );
  }

  instrumentation.addListener(listener);
  installed = true;
}
