export const GLSL_NOISE = /* glsl */ `
float snoise(float x, float y) {
  return fract(sin(dot(vec2(x, y), vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float d00 = snoise(ip.x, ip.y);
  float d01 = snoise(ip.x, ip.y + 1.0);
  float d10 = snoise(ip.x + 1.0, ip.y);
  float d11 = snoise(ip.x + 1.0, ip.y + 1.0);
  vec2 u = fp * fp * (3.0 - 2.0 * fp);
  return mix(mix(d00, d10, u.x), mix(d01, d11, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`;

export const BG_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;export const CLINICAL_WHITE_FRAGMENT = /* glsl */ `
precision highp float;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  float aspect = resolution.x / max(resolution.y, 1.0);
  p.x *= aspect;

  float t = time * 0.04;

  vec3 col1 = vec3(0.95, 0.96, 0.98);
  vec3 col2 = vec3(0.85, 0.92, 0.98);
  vec3 col3 = vec3(0.4, 0.7, 0.85);

  float n = fbm(p * 1.5 + t * 0.1);
  float n2 = fbm(p * 2.5 + vec2(t * 0.05, -t * 0.08));

  vec3 color = mix(col1, col2, n * 0.6);
  color = mix(color, col3, smoothstep(0.3, 0.8, n2) * 0.08);

  float grid = abs(sin(p.x * 30.0) * sin(p.y * 30.0));
  grid = smoothstep(0.97, 1.0, grid);
  color -= vec3(0.01) * grid;

  float vignette = 1.0 - length(p) * 0.12;
  color *= clamp(vignette, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`;export const SURGICAL_GREEN_FRAGMENT = /* glsl */ `
precision highp float;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

${GLSL_NOISE}

void main() {  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  float aspect = resolution.x / max(resolution.y, 1.0);
  p.x *= aspect;

  float t = time * 0.03;

  vec3 col1 = vec3(0.94, 0.99, 0.95);
  vec3 col2 = vec3(0.82, 0.94, 0.85);
  vec3 col3 = vec3(0.2, 0.5, 0.35);

  float n = fbm(p * 1.2 + vec2(t * 0.05, t * 0.03));
  float n2 = fbm(p * 3.0 + vec2(-t * 0.04, t * 0.06));

  vec3 color = mix(col1, col2, n * 0.55);
  color = mix(color, col3, smoothstep(0.35, 0.85, n2) * 0.06);

  float veins = sin(length(p) * 8.0 + t * 0.2);
  veins = smoothstep(0.8, 1.0, abs(veins));
  color += vec3(0.02, 0.05, 0.02) * veins * 0.15;

  float vignette = 1.0 - length(p) * 0.1;
  color *= clamp(vignette, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const WARM_PARCHMENT_FRAGMENT = /* glsl */ `
precision highp float;uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv;  vec2 p = (uv - 0.5) * 2.0;
  float aspect = resolution.x / max(resolution.y, 1.0);
  p.x *= aspect;

  float t = time * 0.02;

  vec3 col1 = vec3(0.96, 0.94, 0.9);
  vec3 col2 = vec3(0.92, 0.88, 0.8);  vec3 col3 = vec3(0.65, 0.55, 0.4);

  float n = fbm(p * 1.8 + vec2(t * 0.03, -t * 0.02));  float n2 = fbm(p * 4.0 + vec2(0.0, t * 0.05) + n);

  vec3 color = mix(col1, col2, n * 0.5);
  color = mix(color, col3, smoothstep(0.4, 0.9, n2) * 0.1);  float grain = fract(sin(dot(p * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  color += vec3(0.015) * (grain - 0.5) * 0.3;

  float vignette = 1.0 - length(p) * 0.15;
  color *= clamp(vignette, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}`;

export const LAVENDER_MIST_FRAGMENT = /* glsl */ `
precision highp float;
uniform float time;
uniform vec2 resolution;varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  float aspect = resolution.x / max(resolution.y, 1.0);
  p.x *= aspect;

  float t = time * 0.035;

  vec3 col1 = vec3(0.95, 0.94, 0.98);
  vec3 col2 = vec3(0.9, 0.87, 0.95);
  vec3 col3 = vec3(0.5, 0.4, 0.7);

  float n = fbm(p * 1.4 + vec2(t * 0.06, t * 0.04));
  float n2 = fbm(p * 2.0 + vec2(-t * 0.05, t * 0.03)) + n * 0.5;

  vec3 color = mix(col1, col2, n * 0.55);
  color = mix(color, col3, smoothstep(0.25, 0.75, n2) * 0.07);

  float swirl = sin(atan(p.y, p.x) * 3.0 + length(p) * 5.0 - t * 0.3);
  swirl = smoothstep(0.7, 1.0, swirl) * 0.15;
  color += vec3(0.05, 0.03, 0.1) * swirl;

  float vignette = 1.0 - length(p) * 0.12;
  color *= clamp(vignette, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}`;

export const FRAGMENT_SHADERS: Record<string, string> = {
  "clinical-white": CLINICAL_WHITE_FRAGMENT,
  "surgical-green": SURGICAL_GREEN_FRAGMENT,
  "warm-parchment": WARM_PARCHMENT_FRAGMENT,
  "lavender-mist": LAVENDER_MIST_FRAGMENT,};
