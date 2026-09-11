/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

// The scaffold turns rspack on. It bundles, but `remotion render` and
// `remotion still` then fail reading the bundle back
// ("ENOENT ... /bundle.js" from the stack symbolicator), so the renderer
// never starts. Webpack is the slower of the two and the one that works.
Config.setRspack(false);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);
