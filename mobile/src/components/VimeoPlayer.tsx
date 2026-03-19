/**
 * VimeoPlayer.tsx
 *
 * Production Vimeo player component.
 * - Uses Vimeo Player JS SDK wrapped around a pre-built <iframe>
 *   so we control the src URL (controls, playsinline, start position).
 * - Detects when Vimeo's "prevent skipping" restriction blocks a forward
 *   seek and emits onSeekRestricted so the parent can inform the user.
 */

import React, {
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VimeoPlayerProps {
  videoId: string;
  height: number;
  /** Resume position in seconds — baked into iframe src as #t=Xs */
  startPosition?: number;
  onStateChange?: (state: "playing" | "paused" | "ended") => void;
  onProgress?: (data: { currentTime: number; duration: number }) => void;
  onLoaded?: (duration: number) => void;
  onError?: (message: string) => void;
  /**
   * Fired when Vimeo blocks a forward seek due to the video owner having
   * "Prevent skipping" / "Playback Segments" enabled on this video.
   * Use this to show an explanatory message to the user.
   */
  onSeekRestricted?: () => void;
}

export interface VimeoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

function buildHtml(videoId: string, startAt: number): string {
  const s = Math.max(0, Math.floor(startAt));
  const hash = s > 0 ? `#t=${s}s` : "";
  const src =
    `https://player.vimeo.com/video/${videoId}` +
    `?controls=1&playsinline=1&autoplay=0&transparent=0${hash}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    iframe{display:block;width:100%;height:100%;border:none}
  </style>
</head>
<body>
  <iframe
    id="vp"
    src="${src}"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen
  ></iframe>

  <script src="https://player.vimeo.com/api/player.js"></script>
  <script>
  (function(){
    var RN = function(obj){
      try{ window.ReactNativeWebView &&
        window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }catch(_){}
    };

    var player   = null;
    var duration = 0;
    var ticker   = null;

    function stopTick(){ if(ticker){ clearInterval(ticker); ticker=null; } }
    // Ticker is a fallback — SDK timeupdate event is the primary source.
    // Fires every 5s to ensure progress is never stale for more than that.
    function startTick(){
      stopTick();
      ticker = setInterval(function(){
        if(!player) return;
        player.getCurrentTime().then(function(t){
          RN({ type:'timeupdate', seconds:t, duration:duration });
        }).catch(function(){});
      }, 5000);
    }

    function init(){
      if(typeof Vimeo === 'undefined' || !Vimeo.Player){
        setTimeout(init, 150);
        return;
      }
      try {
        // Wrap the existing iframe — preserves our custom src URL
        player = new Vimeo.Player(document.getElementById('vp'));
        window.__vp = player;
      } catch(e) {
        RN({ type:'error', message: e&&e.message ? e.message : 'constructor failed' });
        return;
      }

      player.ready()
        .then(function(){ return player.getDuration(); })
        .then(function(d){
          duration = d || 0;
          RN({ type:'loaded', duration:duration });
        })
        .catch(function(e){
          RN({ type:'error', message: e&&e.message ? e.message : 'ready failed' });
        });

      player.on('play',  function(){
        RN({ type:'state', state:'playing' });
        startTick();
      });
      player.on('pause', function(){
        stopTick();
        player.getCurrentTime().then(function(t){
          RN({ type:'timeupdate', seconds:t, duration:duration });
        }).catch(function(){});
        RN({ type:'state', state:'paused' });
      });
      player.on('ended', function(){
        stopTick();
        RN({ type:'timeupdate', seconds:duration, duration:duration });
        RN({ type:'state', state:'ended' });
      });
      // Forward every timeupdate from the SDK — this is the primary
      // progress source. Also keep duration in sync from the payload.
      player.on('timeupdate', function(d){
        if(!d) return;
        if(d.duration > 0) duration = d.duration;
        RN({ type:'timeupdate', seconds:d.seconds, duration:duration });
      });
      player.on('seeked', function(d){
        if(d) RN({ type:'timeupdate', seconds:d.seconds, duration:duration });
      });
      player.on('error', function(e){
        RN({ type:'error', message: e&&e.message ? e.message : 'player error' });
      });
    }

    // ── Imperative API (called via injectJavaScript) ──────────────────────
    window.__play  = function(){ if(window.__vp) window.__vp.play().catch(function(){}); };
    window.__pause = function(){ if(window.__vp) window.__vp.pause().catch(function(){}); };

    window.__seekTo = function(sec){
      var p = window.__vp;
      if(!p) return;

      p.getPaused().then(function(paused){
        if(paused){
          // iOS requires the video to be playing before setCurrentTime works
          return p.play()
            .then(function(){ return p.setCurrentTime(sec); })
            .then(function(t){ return p.pause().then(function(){ return t; }); });
        }
        return p.setCurrentTime(sec);
      }).then(function(t){
        RN({ type:'timeupdate', seconds: typeof t==='number' ? t : sec, duration:duration });
      }).catch(function(e){
        var msg = (e && e.message) ? e.message : '';
        var name = (e && e.name)    ? e.name    : '';
        /*
         * Vimeo throws a RangeError when the video owner has enabled
         * "Prevent skipping" / Playback Segments on this video.
         * The error message is typically:
         *   "The time was less than 0 or greater than the video's duration"
         * even when the requested time IS within duration — Vimeo uses the
         * same error class for its seek-restriction enforcement.
         */
        if(name === 'RangeError' || msg.indexOf('duration') !== -1 || msg.indexOf('seek') !== -1){
          RN({ type:'seekRestricted' });
        } else {
          RN({ type:'error', message: msg || 'seek failed' });
        }
      });
    };

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VimeoPlayer = forwardRef<VimeoPlayerHandle, VimeoPlayerProps>(
  (
    {
      videoId,
      height,
      startPosition = 0,
      onStateChange,
      onProgress,
      onLoaded,
      onError,
      onSeekRestricted,
    },
    ref,
  ) => {
    const webViewRef = useRef<any>(null);
    const frozenStart = useRef(startPosition);
    const prevId = useRef(videoId);

    // Update frozen start when the video changes
    if (videoId !== prevId.current) {
      prevId.current = videoId;
      frozenStart.current = startPosition;
    }

    const html = useMemo(
      () => buildHtml(videoId, frozenStart.current),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [videoId],
    );

    const inject = useCallback((js: string) => {
      webViewRef.current?.injectJavaScript(js + "; true;");
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        play: () => inject("if(window.__play)  window.__play()"),
        pause: () => inject("if(window.__pause) window.__pause()"),
        seekTo: (s: number) =>
          inject(`if(window.__seekTo) window.__seekTo(${Number(s)})`),
      }),
      [inject],
    );

    const onMessage = useCallback(
      (event: any) => {
        try {
          const p = JSON.parse(event.nativeEvent.data ?? "{}");
          switch (p.type) {
            case "loaded":
              if (Number.isFinite(p.duration) && p.duration > 0)
                onLoaded?.(p.duration);
              break;
            case "state":
              onStateChange?.(p.state);
              break;
            case "timeupdate":
              if (Number.isFinite(p.seconds) && Number.isFinite(p.duration))
                onProgress?.({ currentTime: p.seconds, duration: p.duration });
              break;
            case "seekRestricted":
              onSeekRestricted?.();
              break;
            case "error":
              onError?.(p.message ?? "Unknown Vimeo error");
              break;
          }
        } catch (e) {
          console.warn("[VimeoPlayer] onMessage parse error:", e);
        }
      },
      [onStateChange, onProgress, onLoaded, onError, onSeekRestricted],
    );

    return (
      <View style={[styles.container, { height }]}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={["*"]}
          mixedContentMode="always"
          scrollEnabled={false}
          onMessage={onMessage}
          startInLoadingState
          onError={(e) =>
            onError?.(
              "WebView error: " +
                ((e.nativeEvent as any).description ?? "unknown"),
            )
          }
        />
      </View>
    );
  },
);

VimeoPlayer.displayName = "VimeoPlayer";
export default VimeoPlayer;

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "#000", overflow: "hidden" },
  webView: { flex: 1, backgroundColor: "#000" },
});
