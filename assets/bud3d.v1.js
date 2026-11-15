/* Ours, on Angel's room only (loaded after his script by tools/board_sync.py; 14 Nov 2026, Don: "make the center nug a 3d object that
   can be moved and interacted with, like a 3d model you can spin"). The bud over the pedestal becomes a solid a visitor can turn: a
   drag (mouse, finger, pen) spins it and tilts it a little, it coasts to a stop, the arrow keys turn it from the keyboard, and with
   Motion on it gives one slow nudge as it appears and then, on a desktop, sways a little when left alone, so a visitor sees it is a
   thing that turns.

   No model file and no library: the solid is built here from his own picture of the bud (assets/board/bud-room-*.webp). Its outline
   is inflated into a plump body (a rounded profile over the distance to the edge, with the bright calyx tips raised and a little
   noise so the sides are knobbly, not smooth), the picture is laid over the front, its mirror over the back, and the rim and the
   sides take the picture's dense middle. The lighting is normalised to the front view, so at rest the solid is his picture pixel for
   pixel; turning it changes only what turning would change (the far side falls into shade, the frost catches the light). It is drawn
   with WebGL 2 on a canvas over his picture, which stays underneath as the fallback: no WebGL 2, a lost context, a failed picture, or
   a metered line leave his bud exactly as it was. Nothing here touches his code. */
(() => {
  'use strict';
  const html = document.documentElement;
  const room = document.querySelector('.room');
  const bud = room && room.querySelector('.bud');
  const still = bud && bud.querySelector('img');
  if (!room || !bud || !still || !window.WebGL2RenderingContext) return;
  const conn = navigator.connection || null;
  if (conn && (conn.saveData || /(^|\b)(slow-)?2g\b/.test(conn.effectiveType || ''))) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const strip = matchMedia('(max-width: 999px), (max-aspect-ratio: 6/5)');
  const moving = () => !calm.matches && !html.classList.contains('motion-off');
  const onChange = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };
  const gateDown = () => !html.classList.contains('gate-pending') && !html.classList.contains('is-boarding');

  /* ---------- the body, from the picture ---------- */
  const M = 144;        // cells across the picture for the distance field and the light map
  const N = 104;        // vertex columns across the picture for the mesh, each side
  const HMAX = 0.62;    // half the body's thickness, in units where the picture is 2 across
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {   // value noise in [-1, 1]
    const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1;
  };
  const blur = (src, r) => {   // a box blur over the M grid, separable, edges clamped
    const tmp = new Float32Array(M * M), out = new Float32Array(M * M), k = 2 * r + 1;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { let s = 0; for (let t = -r; t <= r; t++) s += src[j * M + Math.min(M - 1, Math.max(0, i + t))]; tmp[j * M + i] = s / k; }
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { let s = 0; for (let t = -r; t <= r; t++) s += tmp[Math.min(M - 1, Math.max(0, j + t)) * M + i]; out[j * M + i] = s / k; }
    return out;
  };
  const fields = (img) => {
    const S = img.naturalWidth;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c2 = cv.getContext('2d', { willReadFrequently: true });
    c2.drawImage(img, 0, 0);
    const px = c2.getImageData(0, 0, S, S).data;
    const inside = new Uint8Array(M * M), lum = new Float32Array(M * M);
    const cell = S / M;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const x = Math.min(S - 1, Math.floor((i + 0.5) * cell)), y = Math.min(S - 1, Math.floor((j + 0.5) * cell));
      const k = (y * S + x) * 4;
      inside[j * M + i] = px[k + 3] > 128 ? 1 : 0;
      lum[j * M + i] = (0.3 * px[k] + 0.59 * px[k + 1] + 0.11 * px[k + 2]) / 255;
    }
    /* the distance to the edge, in cells (a two-pass chamfer, 3 straight and 4 diagonal) */
    const BIG = 1e6, d = new Float32Array(M * M);
    for (let k = 0; k < M * M; k++) d[k] = inside[k] ? BIG : 0;
    const at = (i, j) => (i < 0 || j < 0 || i >= M || j >= M) ? 0 : d[j * M + i];
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { const k = j * M + i; if (!d[k]) continue; d[k] = Math.min(d[k], at(i - 1, j) + 3, at(i, j - 1) + 3, at(i - 1, j - 1) + 4, at(i + 1, j - 1) + 4); }
    for (let j = M - 1; j >= 0; j--) for (let i = M - 1; i >= 0; i--) { const k = j * M + i; if (!d[k]) continue; d[k] = Math.min(d[k], at(i + 1, j) + 3, at(i, j + 1) + 3, at(i + 1, j + 1) + 4, at(i - 1, j + 1) + 4); }
    let dmax = 0;
    for (let k = 0; k < M * M; k++) { d[k] /= 3; if (d[k] > dmax) dmax = d[k]; }
    /* the calyx tips: the light map's fine detail over its broad shade, scaled to unit spread over the body */
    const fineL = blur(lum, 1), broad = blur(lum, 5), band = new Float32Array(M * M);
    let sum = 0, n = 0;
    for (let k = 0; k < M * M; k++) { band[k] = fineL[k] - broad[k]; if (inside[k]) { sum += band[k] * band[k]; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1;
    for (let k = 0; k < M * M; k++) band[k] = Math.max(-2, Math.min(2, band[k] / rms));
    /* the picture's alpha at any point, for the outline (bilinear over the pixels) */
    const alphaAt = (u, v) => {
      const x = Math.min(S - 1.001, Math.max(0, u * S - 0.5)), y = Math.min(S - 1.001, Math.max(0, v * S - 0.5));
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      const a = px[(j * S + i) * 4 + 3], b = px[(j * S + i + 1) * 4 + 3], c = px[((j + 1) * S + i) * 4 + 3], e = px[((j + 1) * S + i + 1) * 4 + 3];
      return (a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy) / 255;
    };
    return { d, dmax, band, alphaAt };
  };
  const sample = (f, u, v) => {   // bilinear, u and v in [0, 1] over the M grid's cell centres
    const x = Math.min(M - 1.001, Math.max(0, u * M - 0.5)), y = Math.min(M - 1.001, Math.max(0, v * M - 0.5));
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const a = f[j * M + i], b = f[j * M + i + 1], c = f[(j + 1) * M + i], e = f[(j + 1) * M + i + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
  };
  const FLOATS = 13;   // position 3, the normal 3, the smooth body's normal 3, uv 2, side 1, the reach in from the outline 1
  const mesh = (img) => {
    const { d, dmax, band, alphaAt } = fields(img);
    const V = N + 1, count = V * V;
    const reach = (u, v) => Math.min(1, Math.max(0, sample(d, u, v)) / (dmax * 0.9));   // 0 at the outline, 1 well inside
    const height = (t, u, v, mirror, plain) => {   // the body's half thickness at a point of the picture, 0 off the flower; plain = the smooth body with no bumps
      if (t <= 0) return 0;
      const profile = Math.sqrt(1 - (1 - t) * (1 - t));
      if (plain) return Math.max(0.004, HMAX * profile);
      const um = mirror ? 1 - u : u;
      const bumps = 0.055 * sample(band, um, v) + 0.035 * noise(um * 7 + 3.1, v * 7 + 1.7) + 0.02 * noise(um * 15 + 7.3, v * 15 + 4.9);
      return Math.max(0.004, HMAX * profile + bumps * profile);
    };
    const uu = new Float32Array(count), vv = new Float32Array(count), tR = new Float32Array(count), aa = new Float32Array(count);
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) { const k = j * V + i; uu[k] = i / N; vv[k] = j / N; tR[k] = reach(uu[k], vv[k]); aa[k] = alphaAt(uu[k], vv[k]); }
    /* a vertex just outside the outline moves onto it (to where the picture's alpha crosses a half, toward its most solid neighbour),
       so the body's edge is the picture's edge and no flange of side texture shows round the face at rest */
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
      const k = j * V + i;
      if (tR[k] > 0) continue;
      let best = -1, bestA = 0.5;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii > N || jj > N) continue;
        const kk = jj * V + ii;
        if (tR[kk] > 0 && aa[kk] > bestA) { bestA = aa[kk]; best = kk; }
      }
      if (best < 0) continue;
      const f = Math.min(1, Math.max(0, (0.5 - aa[k]) / Math.max(1e-3, aa[best] - aa[k])));
      uu[k] += (uu[best] - uu[k]) * f;
      vv[k] += (vv[best] - vv[k]) * f;
    }
    const zF = new Float32Array(count), zB = new Float32Array(count), zS = new Float32Array(count);
    for (let k = 0; k < count; k++) { zF[k] = height(tR[k], uu[k], vv[k], false); zB[k] = height(tR[k], uu[k], vv[k], true); zS[k] = height(tR[k], uu[k], vv[k], false, true); }
    const data = new Float32Array(count * 2 * FLOATS);
    const step = 2 / N;
    const normal = (z, i, j) => {
      const zl = z[j * V + Math.max(0, i - 1)], zr = z[j * V + Math.min(N, i + 1)];
      const zu = z[Math.max(0, j - 1) * V + i], zd = z[Math.min(N, j + 1) * V + i];
      const dzdx = (zr - zl) / (step * (i === 0 || i === N ? 1 : 2));
      const dzdy = (zu - zd) / (step * (j === 0 || j === N ? 1 : 2));   // y runs up the picture, j runs down it
      const len = Math.hypot(dzdx, dzdy, 1);
      return [-dzdx / len, -dzdy / len, 1 / len];
    };
    const put = (side, z) => {   // the back is the same height field mirrored in z: its normal keeps x and y and turns z round
      const base = side > 0 ? 0 : count;
      for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
        const k = j * V + i, o = (base + k) * FLOATS;
        const n = normal(z, i, j), ns = normal(zS, i, j);
        data[o] = (uu[k] - 0.5) * 2; data[o + 1] = (0.5 - vv[k]) * 2; data[o + 2] = side * z[k];
        data[o + 3] = n[0]; data[o + 4] = n[1]; data[o + 5] = n[2] * side;
        data[o + 6] = ns[0]; data[o + 7] = ns[1]; data[o + 8] = ns[2] * side;
        data[o + 9] = uu[k]; data[o + 10] = vv[k]; data[o + 11] = side; data[o + 12] = tR[k];
      }
    };
    put(1, zF); put(-1, zB);
    const idx = [];
    const on = (i, j) => tR[j * V + i] > 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * V + i, b = a + 1, c = a + V, e = c + 1;
      if (on(i, j) || on(i + 1, j) || on(i, j + 1) || on(i + 1, j + 1)) {
        idx.push(a, c, b, b, c, e);                                           // the front, counter-clockwise seen from the front
        idx.push(count + a, count + b, count + c, count + b, count + e, count + c);   // the back, counter-clockwise seen from behind
      }
    }
    return { data, idx: new Uint32Array(idx), count: count * 2 };
  };

  /* ---------- the drawing ---------- */
  const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aNs; layout(location=3) in vec2 aUv; layout(location=4) in float aSide; layout(location=5) in float aRim;
uniform mat3 uRot; uniform vec2 uScale;
out vec3 vN; out vec3 vN0; out vec3 vNs; out vec3 vP0; out vec2 vUv; out float vSide; out float vRim;
void main() { vec3 p = uRot * aPos; vN = uRot * aNrm; vN0 = aNrm; vNs = aNs; vP0 = aPos; vUv = aUv; vSide = aSide; vRim = aRim; gl_Position = vec4(p.xy * uScale, -p.z * 0.25, 1.0); }`;
  const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uLife;
in vec3 vN; in vec3 vN0; in vec3 vNs; in vec3 vP0; in vec2 vUv; in float vSide; in float vRim;
out vec4 o;
const vec3 KEY = vec3(0.3077, 0.5641, 0.8000);
const vec3 GLOW = vec3(0.608, 0.863, 0.969);
float lit(vec3 n) { float key = max(dot(n, KEY), 0.0); float up = n.y * 0.5 + 0.5; return 0.20 + 0.58 * key + mix(0.40, 0.24, up); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN); vec3 n0 = normalize(vN0); vec3 ns = normalize(vNs);
  vec2 uvF = vec2(vSide > 0.0 ? vUv.x : 1.0 - vUv.x, vUv.y);
  vec4 tF = texture(uTex, uvF);
  /* the rim is the outer sixth of the body where the smooth profile stands steep: solid whatever the picture's alpha says there, and
     dressed in the sides' texture, so the front and the back meet in one closed rounded edge (the first cut let the rim take the
     picture's fading alpha and it showed as a pale glassy seam side on: the critique of 14 Nov) */
  float steep = 1.0 - smoothstep(0.35, 0.7, abs(ns.z));
  float rim = (1.0 - smoothstep(0.05, 0.16, vRim)) * steep;
  float faceA = smoothstep(0.3, 0.7, tF.a);
  float a = max(faceA, rim);
  if (a < 0.02) discard;
  /* his picture covers the face; the sides (the rim, the smooth body within about 25 degrees of side on, or where the picture has no
     pixel) borrow the picture's middle, projected along x or y */
  float sideW = max(rim, max(1.0 - smoothstep(0.1, 0.42, abs(ns.z)), 1.0 - smoothstep(0.02, 0.3, tF.a)));
  float wx = abs(ns.x) / max(abs(ns.x) + abs(ns.y), 1e-4);
  vec4 tX = texture(uTex, 0.5 + 0.3 * vec2(vP0.z, -vP0.y));
  vec4 tY = texture(uTex, 0.5 + 0.3 * vec2(vP0.x, -vP0.z));
  /* the face keeps the light his picture was taken in (the ratio is 1 at rest, and it is held within a quarter either way so a
     turned facet never glows); the back wears the picture's mirror, whose pixels were lit facing the camera too, so it is normalised
     as if it faced front; the sides' pixels were lit face on as well */
  float here = lit(n);
  vec3 was = vSide > 0.0 ? n0 : vec3(n0.xy, abs(n0.z));
  vec3 face = tF.rgb / max(tF.a, 1e-3) * clamp(here / max(lit(was), 0.5), 0.6, 1.25);
  vec3 side = (wx * tX.rgb / max(tX.a, 1e-3) + (1.0 - wx) * tY.rgb / max(tY.a, 1e-3)) * clamp(here / lit(vec3(0.0, 0.0, 1.0)), 0.5, 1.2) * 0.86;
  vec3 c = mix(face, side, sideW);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float spec = pow(max(dot(n, normalize(V + KEY)), 0.0), 40.0);
  float g = hash(floor(vP0.xy * 90.0 + vP0.z * 31.0));   // the frost's grains sit on the body, not on the picture, so a side shows as many as the face
  float frost = smoothstep(0.88, 0.98, g) * pow(max(dot(n, normalize(V + vec3(-0.196, 0.686, 0.700))), 0.0), 90.0);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0) * (1.0 - rim);
  c += uLife * (spec * 0.12 * vec3(0.9, 0.97, 1.0) + frost * 0.45 + fres * 0.16 * GLOW);
  o = vec4(c * a, a);
}`;
  const rotation = (yaw, pitch) => {   // the turn about the upright axis first, then the tilt about the screen's own x axis; column major for a mat3 uniform
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
  };

  let canvas = null, gl = null, geo = null, img = null, started = false, loop = 0, hint = null;
  const state = { yaw: 0, pitch: 0, vel: 0, dragging: false, pointer: null, life: 0, entry: 0, entryT: 0, quiet: 0, swayGain: 0, swayNow: 0, nodNow: 0, idle: 0, keysTo: null, frames: 0, lastDraw: 0 };
  const OVER = 1.2;   // the canvas is a fifth wider than his picture's box, so the body has room to swing (clipped round, see the stylesheet)
  const attach = () => {
    const ctx = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power', depth: true, stencil: false, preserveDrawingBuffer: false });
    if (!ctx) return false;
    gl = ctx;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, geo.data, gl.STATIC_DRAW);
    const stride = FLOATS * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 36);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 44);
    gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, 48);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
    gl.u = { rot: gl.getUniformLocation(prog, 'uRot'), scale: gl.getUniformLocation(prog, 'uScale'), life: gl.getUniformLocation(prog, 'uLife') };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.clearColor(0, 0, 0, 0);
    return true;
  };
  const size = () => {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  const draw = (yaw, pitch) => {
    if (!gl || gl.isContextLost()) return;
    size();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix3fv(gl.u.rot, false, rotation(yaw, pitch));
    gl.uniform2f(gl.u.scale, 1 / OVER, canvas.width / canvas.height / OVER);
    gl.uniform1f(gl.u.life, state.life);
    gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_INT, 0);
    state.frames++;
    state.lastDraw = performance.now();
  };

  /* ---------- the motion: a drag, its coasting, the keys, the nudge on arrival, the sway ---------- */
  let shown = false, inView = true, last = 0;
  const clampPitch = (p) => Math.max(-0.45, Math.min(0.45, p));
  /* the sway is folded into the pose the moment the visitor takes hold, or Motion goes off, so nothing jumps */
  const settle = () => { state.yaw += state.swayNow; state.pitch = clampPitch(state.pitch + state.nodNow); state.swayNow = 0; state.nodNow = 0; state.swayGain = 0; state.quiet = 0; };
  const frame = (now) => {
    loop = 0;
    if (!gl || gl.isContextLost()) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    const on = moving();
    if (state.life < 1) state.life = Math.min(1, state.life + dt / 1.2);
    if (!state.dragging) {
      if (state.keysTo !== null) {   // the keys ease the body to where they asked
        const dy = state.keysTo.yaw - state.yaw, dp = state.keysTo.pitch - state.pitch;
        state.yaw += dy * Math.min(1, dt * 6); state.pitch += dp * Math.min(1, dt * 6);
        if (Math.abs(dy) < 0.002 && Math.abs(dp) < 0.002) { state.yaw = state.keysTo.yaw; state.pitch = state.keysTo.pitch; state.keysTo = null; }
      } else if (Math.abs(state.vel) > 0.002) {   // coasting after a drag: a flick carries at most half a turn further
        state.yaw += state.vel * dt;
        state.vel *= Math.exp(-dt * 3.0);
        if (Math.abs(state.vel) <= 0.002) state.vel = 0;
      }
    }
    /* the arrival: once his picture has faded out under the canvas, one slow nudge out and back (0.45 rad over 1.6 s), with Motion on */
    let entry = 0;
    if (!on) state.entry = 1;
    else if (state.entry < 1) {
      state.entryT += dt;
      if (state.entryT > 0.45) { state.entry = Math.min(1, (state.entryT - 0.45) / 1.6); const s = Math.sin(Math.PI * state.entry); entry = 0.45 * s * s; }
    }
    /* the sway: a desktop's, when the visitor has left the body alone for two seconds, ramping in from a zero crossing; a phone gets
       the nudge and his float, and then draws only when a finger moves it */
    const busy = state.dragging || state.keysTo !== null || Math.abs(state.vel) > 0.002;
    const swaying = on && fine.matches && state.entry >= 1;
    if (busy || !swaying) { if (state.swayGain > 0) settle(); state.quiet = 0; }
    else {
      state.quiet += dt;
      if (state.quiet > 2) {
        if (state.swayGain === 0) state.idle = 0;
        state.swayGain = Math.min(1, state.swayGain + dt / 1.5);
        state.idle += dt;
      }
    }
    state.swayNow = state.swayGain * 0.2 * Math.sin(state.idle * 0.39);
    state.nodNow = state.swayGain * 0.045 * Math.sin(state.idle * 0.57);
    const alive = busy || state.life < 1 || (on && state.entry < 1) || swaying;
    const idleOnly = !busy && state.life >= 1 && state.entry >= 1;   // only the sway moves: a quarter of the frames are plenty for a tenth of a pixel
    if (!idleOnly || now - state.lastDraw >= 40 || !shown) {
      draw(state.yaw + state.swayNow + entry, state.pitch + state.nodNow);
      if (!shown) { shown = true; bud.classList.add('is-turning'); canvas.tabIndex = 0; bud.removeAttribute('aria-hidden'); }
    }
    if (alive && inView && !document.hidden && gateDown()) loop = requestAnimationFrame(frame);
    else last = 0;
  };
  const wake = () => { if (!loop && gl && !gl.isContextLost()) loop = requestAnimationFrame(frame); };
  const turned = () => { if (bud.classList.contains('was-turned')) return; bud.classList.add('was-turned'); bud.classList.remove('show-hint'); try { sessionStorage.setItem('sw-bud-turned', '1'); } catch (e) { /* storage is off: the hint shows again next time */ } };
  const undo = () => {   // anything that fails leaves his bud as it was
    if (loop) cancelAnimationFrame(loop);
    loop = 0; gl = null;
    if (canvas) canvas.remove();
    if (hint) hint.remove();
    canvas = null; hint = null;
    bud.classList.remove('is-turning', 'is-held', 'show-hint');
    bud.setAttribute('aria-hidden', 'true');
  };

  const listen = () => {
    const k = () => Math.PI / Math.max(40, canvas.clientWidth / OVER);   // a drag across the flower is half a turn
    let px = 0, py = 0, pt = 0, moved = 0;
    const samples = [];
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (state.pointer !== null) return;   // one finger steers; a second changes nothing
      e.stopPropagation();   // his script would start to drag the strip, or note a touch, from this press
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      settle();
      state.pointer = e.pointerId; state.dragging = true; state.vel = 0; state.keysTo = null; moved = 0;
      px = e.clientX; py = e.clientY; pt = performance.now(); samples.length = 0;
      bud.classList.add('is-held');
      wake();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!state.dragging || e.pointerId !== state.pointer) return;
      const now = performance.now(), dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      state.yaw += dx * k();
      state.pitch = clampPitch(state.pitch + dy * k() * 0.6);
      samples.push([now, dx * k()]);
      while (samples.length && now - samples[0][0] > 90) samples.shift();
      pt = now;
      if (moved > 6) turned();
      wake();
    });
    const release = (e) => {
      if (!state.dragging || (e && e.pointerId !== state.pointer)) return;
      state.dragging = false; state.pointer = null;
      bud.classList.remove('is-held');
      const now = performance.now();
      const recent = samples.filter((s) => now - s[0] <= 90);
      if (moving() && recent.length > 1 && now - pt < 120) {
        const span = Math.max(0.016, (recent[recent.length - 1][0] - recent[0][0]) / 1000);
        const turn = recent.slice(1).reduce((a, s) => a + s[1], 0);
        state.vel = Math.max(-9, Math.min(9, turn / span));
      } else state.vel = 0;
      samples.length = 0;
      wake();
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });   // a press on the flower is never a click on the door behind it
    canvas.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;   // the browser's own shortcuts (Alt and an arrow is Back) stay the browser's
      const to = state.keysTo || { yaw: state.yaw, pitch: state.pitch };
      const near = (y) => Math.max(state.yaw - 0.9, Math.min(state.yaw + 0.9, y));   // a held key never runs away from the body
      if (e.key === 'ArrowLeft') to.yaw = near(to.yaw - 0.3); else if (e.key === 'ArrowRight') to.yaw = near(to.yaw + 0.3);
      else if (e.key === 'ArrowUp') to.pitch = clampPitch(to.pitch - 0.2); else if (e.key === 'ArrowDown') to.pitch = clampPitch(to.pitch + 0.2);
      else if (e.key === 'Home') { to.yaw = Math.round(state.yaw / (2 * Math.PI)) * 2 * Math.PI; to.pitch = 0; }
      else return;
      e.preventDefault();
      settle();
      state.vel = 0; state.keysTo = to; turned(); wake();
    });
    canvas.addEventListener('focus', () => { if (hint) hint.textContent = 'Arrow keys to turn'; });
    canvas.addEventListener('blur', () => { if (hint) hint.textContent = 'Drag to turn'; });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();   // his picture comes back under the canvas, and the canvas is no longer a stop for the keyboard
      bud.classList.remove('is-turning'); bud.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1; shown = false;
      if (loop) cancelAnimationFrame(loop); loop = 0;
    });
    canvas.addEventListener('webglcontextrestored', () => { try { if (attach()) { last = 0; wake(); } } catch (err) { undo(); } });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es.some((x) => x.isIntersecting); if (inView) wake(); }, { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    new MutationObserver(wake).observe(html, { attributes: true, attributeFilter: ['class'] });
    onChange(calm, wake);
    if ('ResizeObserver' in window) new ResizeObserver(() => { size(); wake(); if (!loop && shown) draw(state.yaw + state.swayNow, state.pitch + state.nodNow); }).observe(bud);
    addEventListener('pageshow', (e) => { if (e.persisted) { last = 0; wake(); } });
  };

  const build = () => {
    geo = mesh(img);
    canvas = document.createElement('canvas');
    canvas.className = 'bud__turn';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'A bud of Space Weed flower, floating over the pedestal. Drag it, or use the arrow keys, to turn it.');
    canvas.tabIndex = -1;   // a stop for the keyboard once it is shown
    bud.appendChild(canvas);
    hint = document.createElement('span');
    hint.className = 'bud__hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Drag to turn';
    bud.appendChild(hint);
    try { if (sessionStorage.getItem('sw-bud-turned')) bud.classList.add('was-turned'); } catch (e) { /* storage is off */ }
    if (!attach()) { undo(); return; }
    /* the canvas floats as his picture floats: the same keyframes, started at the same point of their run */
    try {
      const drift = (el) => el.getAnimations().find((a) => a.animationName === 'drift');
      const his = drift(still), ours = drift(canvas);
      if (his && ours) ours.currentTime = his.currentTime;
    } catch (e) { /* the two drift a beat apart */ }
    size();
    listen();
    /* read by the QA harnesses (tools/budturn.mjs, tools/tourfilm.mjs): the state, and turn() to set it and draw at once */
    canvas.bud3d = { get yaw() { return state.yaw; }, get pitch() { return state.pitch; }, get vel() { return state.vel; }, get frames() { return state.frames; }, get dragging() { return state.dragging; },
      vertices: geo.count, triangles: geo.idx.length / 3,
      turn(yaw, pitch) { settle(); state.yaw = yaw; state.pitch = clampPitch(pitch || 0); state.vel = 0; state.keysTo = null; state.entry = 1; state.life = 1; draw(state.yaw, state.pitch); wake(); } };
    if (!moving()) { state.entry = 1; state.life = 1; }
    /* a finger gets the hint once his own "Swipe to look around" has had its moment: five seconds in, for four */
    if (!fine.matches && !bud.classList.contains('was-turned')) setTimeout(() => { if (!bud.classList.contains('was-turned') && canvas) { bud.classList.add('show-hint'); setTimeout(() => bud.classList.remove('show-hint'), 4000); } }, 5000);
    wake();
  };
  const start = () => {
    if (started) return;
    started = true;
    img = new Image();
    img.decoding = 'async';
    img.src = fine.matches && !strip.matches ? 'assets/board/bud-room-720.webp' : 'assets/board/bud-room-360.webp';
    const go = () => { try { build(); } catch (e) { undo(); } };
    if (img.decode) img.decode().then(go, () => {}); else { img.onload = go; }
  };
  /* the body is built once the room is in front of the visitor: after the gate (or after load, when the answer is kept) and a
     breath, so the room picture and the flower behind the glass come first */
  let timer = 0;
  const ready = () => {
    if (started || timer) return;
    if (!gateDown() || document.readyState !== 'complete') return;
    timer = setTimeout(() => { timer = 0; if (gateDown()) start(); else ready(); }, 1400);
  };
  ready();
  if (document.readyState !== 'complete') addEventListener('load', ready, { once: true });
  new MutationObserver(ready).observe(html, { attributes: true, attributeFilter: ['class'] });
})();
