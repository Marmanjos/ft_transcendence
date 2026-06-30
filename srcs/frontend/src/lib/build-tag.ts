// Bump this on every frontend change you want to identify quickly.
export const DEFAULT_3V3_BUILD_TAG = "001.000.006";

export const BUILD_TAG =
  import.meta.env.VITE_3V3_BUILD_TAG?.trim() || DEFAULT_3V3_BUILD_TAG;
