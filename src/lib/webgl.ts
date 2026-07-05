import { FilterSettings } from '../types';

export class WebGLFilterEngine {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texcoordBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.initGL();
  }

  private initGL() {
    this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
              this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
              
    if (!this.gl) {
      console.error("WebGL not supported");
      return;
    }

    const gl = this.gl;

    // Vertex Shader
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y); // Flip Y
      }
    `;

    // Fragment Shader
    const fsSource = `
      precision mediump float;
      
      uniform sampler2D u_image;
      varying vec2 v_texCoord;
      
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      uniform float u_hue;
      uniform float u_temperature;
      uniform float u_vignette;
      uniform float u_grain;
      
      // Convolution parameters
      uniform vec2 u_textureSize;
      uniform float u_kernel[9];
      uniform float u_kernelWeight;
      
      vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      void main() {
        // Convolution
        vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
        vec4 colorSum =
          texture2D(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
          texture2D(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
          texture2D(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
          texture2D(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
          texture2D(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[4] +
          texture2D(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
          texture2D(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
          texture2D(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
          texture2D(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8] ;
        
        vec4 baseColor = vec4((colorSum / u_kernelWeight).rgb, 1.0);
        
        // Base color could be out of bounds after convolution
        baseColor.rgb = clamp(baseColor.rgb, 0.0, 1.0);

        // Temperature (yellow/blue shift)
        baseColor.r = clamp(baseColor.r + u_temperature * 0.2, 0.0, 1.0);
        baseColor.b = clamp(baseColor.b - u_temperature * 0.2, 0.0, 1.0);

        // Adjust Brightness & Contrast
        baseColor.rgb = (baseColor.rgb - 0.5) * u_contrast + 0.5 + u_brightness;
        
        // Adjust Hue & Saturation
        vec3 hsv = rgb2hsv(baseColor.rgb);
        hsv.x += u_hue;
        if (hsv.x > 1.0) hsv.x -= 1.0;
        if (hsv.x < 0.0) hsv.x += 1.0;
        hsv.y *= u_saturation;
        baseColor.rgb = hsv2rgb(hsv);
        
        // Vignette
        vec2 centerCoords = v_texCoord - 0.5;
        float dist = length(centerCoords);
        float vignetteEffect = smoothstep(0.8, 0.2, dist * (1.0 + u_vignette));
        baseColor.rgb = mix(baseColor.rgb, baseColor.rgb * vignetteEffect, u_vignette);

        // Grain
        float noise = random(v_texCoord * u_textureSize) - 0.5;
        baseColor.rgb += noise * u_grain;

        gl_FragColor = vec4(clamp(baseColor.rgb, 0.0, 1.0), 1.0);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
    
    if (!vertexShader || !fragmentShader) return;

    this.program = gl.createProgram();
    if (!this.program) return;
    
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program));
      return;
    }

    // Buffers setup
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    this.texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1,
    ]), gl.STATIC_DRAW);
  }

  private compileShader(type: number, source: string) {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  setImage(imgData: ImageData | HTMLImageElement) {
    if (!this.gl) return;
    const gl = this.gl;
    
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }
    
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // Set parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    // Upload image
    if (imgData instanceof ImageData) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgData);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgData);
    }
  }

  render(settings: FilterSettings) {
    if (!this.gl || !this.program || !this.texture) return;
    const gl = this.gl;
    const program = this.program;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Position attribute
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // TexCoord attribute
    const texcoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), settings.brightness);
    gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), settings.contrast);
    gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), settings.saturation);
    gl.uniform1f(gl.getUniformLocation(program, "u_hue"), settings.hue);
    gl.uniform1f(gl.getUniformLocation(program, "u_temperature"), settings.temperature || 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_vignette"), settings.vignette || 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_grain"), settings.grain || 0);
    
    gl.uniform2f(gl.getUniformLocation(program, "u_textureSize"), gl.canvas.width, gl.canvas.height);

    // Kernel for sharpness
    // Base Identity: [0, 0, 0, 0, 1, 0, 0, 0, 0]
    // Sharpen edge: [0, -1, 0, -1, 5, -1, 0, -1, 0]
    const s = settings.sharpness;
    const kernel = [
       0, -s,  0,
      -s, 1 + 4*s, -s,
       0, -s,  0
    ];
    gl.uniform1fv(gl.getUniformLocation(program, "u_kernel[0]"), kernel);
    gl.uniform1f(gl.getUniformLocation(program, "u_kernelWeight"), 1.0); // 1.0 for this normalized kernel

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  getCanvas() {
    return this.canvas;
  }

  getImageData(): ImageData | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    
    // Create buffer to read pixels
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // WebGL reads pixels bottom-up, we need to flip them vertically for ImageData
    const flippedPixels = new Uint8Array(width * height * 4);
    for (let row = 0; row < height; row++) {
      const srcRow = row * width * 4;
      const dstRow = (height - row - 1) * width * 4;
      flippedPixels.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow);
    }
    
    return new ImageData(new Uint8ClampedArray(flippedPixels), width, height);
  }
}
