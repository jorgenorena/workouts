export function createWakeLockController(options = {}) {
  const logger = options.logger ?? console;
  let desiredActive = false;
  let sentinel = null;
  let sentinelReleaseHandler = null;

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return {
    async sync(shouldBeActive) {
      desiredActive = shouldBeActive;

      if (!supportsWakeLock()) {
        return false;
      }

      if (!desiredActive) {
        await releaseCurrentSentinel();
        return false;
      }

      if (document.visibilityState !== "visible") {
        return false;
      }

      if (sentinel) {
        return true;
      }

      await requestSentinel();
      return Boolean(sentinel);
    },
    async dispose() {
      desiredActive = false;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      await releaseCurrentSentinel();
    },
  };

  async function requestSentinel() {
    try {
      sentinel = await navigator.wakeLock.request("screen");
      sentinelReleaseHandler = () => {
        sentinel = null;
        sentinelReleaseHandler = null;

        if (desiredActive && document.visibilityState === "visible") {
          void requestSentinel();
        }
      };
      sentinel.addEventListener("release", sentinelReleaseHandler, { once: true });
    } catch (error) {
      logger.warn("Wake lock request failed.", error);
      sentinel = null;
      sentinelReleaseHandler = null;
    }
  }

  async function releaseCurrentSentinel() {
    if (!sentinel) {
      return;
    }

    const activeSentinel = sentinel;
    sentinel = null;

    if (sentinelReleaseHandler) {
      activeSentinel.removeEventListener("release", sentinelReleaseHandler);
      sentinelReleaseHandler = null;
    }

    try {
      await activeSentinel.release();
    } catch (error) {
      logger.warn("Wake lock release failed.", error);
    }
  }

  function handleVisibilityChange() {
    if (!supportsWakeLock()) {
      return;
    }

    if (document.visibilityState === "visible" && desiredActive && !sentinel) {
      void requestSentinel();
      return;
    }

    if (document.visibilityState !== "visible" && sentinel) {
      void releaseCurrentSentinel();
    }
  }
}

function supportsWakeLock() {
  return (
    typeof navigator !== "undefined" &&
    "wakeLock" in navigator &&
    typeof document !== "undefined"
  );
}
