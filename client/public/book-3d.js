// <book-3d> — spinning hardcover journal, adapted from the 3D Hardcover Book handoff.
// Classic script: three.js is pulled in via dynamic import so no import map is needed.
(function () {
  const THREE_URL = 'https://unpkg.com/three@0.184.0/build/three.module.js';
  let threePromise = null;
  const loadThree = () => (threePromise || (threePromise = import(THREE_URL)));

  class Book3D extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      this.style.position = this.style.position || 'relative';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      loadThree().then((THREE) => this._init(THREE)).catch((e) => console.error('book-3d: three.js failed to load', e));
    }

    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
      if (this._renderer) this._renderer.dispose();
    }

    _init(THREE) {
      const front = this.getAttribute('front') || 'assets/cover-front.jpeg';
      const back = this.getAttribute('back') || 'assets/cover-back.jpeg';
      const speed = parseFloat(this.getAttribute('speed') || '0.45');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
      this.appendChild(renderer.domElement);
      this._renderer = renderer;

      const aniso = renderer.capabilities.getMaxAnisotropy();
      const loader = new THREE.TextureLoader();
      const tex = (src) => {
        const t = loader.load(src);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        return t;
      };

      scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x0a1330, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(0.45, 0.55, 0.75);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xc9d6ff, 0.75);
      fill.position.set(-0.7, 0.15, 0.4);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffd9a0, 0.9);
      rim.position.set(-0.4, -0.3, -0.8);
      scene.add(rim);

      const W = 0.210, H = 0.297, COVER_T = 0.0035, PAGES_T = 0.030, OVERHANG = 0.004;
      const HALF = PAGES_T / 2 + COVER_T / 2;

      const navy = new THREE.MeshStandardMaterial({ name: 'navy_board', color: 0x101c3d, roughness: 0.62, metalness: 0.08 });
      const gold = new THREE.MeshStandardMaterial({ name: 'gold_foil', color: 0xd9a94a, roughness: 0.32, metalness: 0.35 });
      const paper = new THREE.MeshStandardMaterial({ name: 'paper_block', color: 0xf3efe6, roughness: 0.92, metalness: 0 });

      const c = document.createElement('canvas');
      c.width = 1024; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#f4f0e7'; g.fillRect(0, 0, c.width, c.height);
      for (let x = 0; x < c.width; x += 3) {
        g.fillStyle = x % 6 === 0 ? 'rgba(120,110,92,0.30)' : 'rgba(160,150,130,0.14)';
        g.fillRect(x, 0, 1, c.height);
      }
      const edgeTex = new THREE.CanvasTexture(c);
      edgeTex.colorSpace = THREE.SRGBColorSpace;
      edgeTex.wrapS = edgeTex.wrapT = THREE.RepeatWrapping;
      edgeTex.repeat.set(6, 1);
      const pageEdge = new THREE.MeshStandardMaterial({ name: 'paper_edges', map: edgeTex, color: 0xffffff, roughness: 0.95 });

      const frontArt = new THREE.MeshStandardMaterial({ name: 'cover_front_art', map: tex(front), roughness: 0.42, metalness: 0.06 });
      const backArt = new THREE.MeshStandardMaterial({ name: 'cover_back_art', map: tex(back), roughness: 0.42, metalness: 0.06 });

      const book = new THREE.Group();
      book.name = 'journal_book';

      const coverGeo = new THREE.BoxGeometry(W + OVERHANG, H + OVERHANG * 2, COVER_T);
      const fc = new THREE.Mesh(coverGeo, [navy, navy, navy, navy, frontArt, navy]);
      fc.name = 'cover_front';
      fc.position.set(OVERHANG / 2, 0, HALF);
      book.add(fc);
      const bc = new THREE.Mesh(coverGeo, [navy, navy, navy, navy, navy, backArt]);
      bc.name = 'cover_back';
      bc.position.set(OVERHANG / 2, 0, -HALF);
      book.add(bc);

      const spineR = PAGES_T / 2 + COVER_T;
      const spine = new THREE.Mesh(
        new THREE.CylinderGeometry(spineR, spineR, H + OVERHANG * 2, 48, 1, true, Math.PI, Math.PI),
        new THREE.MeshStandardMaterial({ name: 'spine_board', color: 0x101c3d, roughness: 0.62, metalness: 0.08, side: THREE.DoubleSide })
      );
      spine.name = 'spine';
      spine.position.set(-W / 2, 0, 0);
      book.add(spine);

      for (const [sign, label] of [[1, 'spine_cap_top'], [-1, 'spine_cap_bottom']]) {
        const cap = new THREE.Mesh(new THREE.CircleGeometry(spineR, 48, Math.PI / 2, Math.PI), navy);
        cap.name = label;
        cap.rotation.x = sign * -Math.PI / 2;
        cap.position.set(-W / 2, sign * (H / 2 + OVERHANG) - sign * 0.0001, 0);
        book.add(cap);
      }

      [0.088, -0.088].forEach((y, i) => {
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(spineR + 0.0006, spineR + 0.0006, 0.0035, 48, 1, true, Math.PI, Math.PI),
          gold
        );
        band.name = 'spine_band_' + (i + 1);
        band.position.set(-W / 2, y, 0);
        book.add(band);
      });

      const pagesW = W - 0.006;
      const pages = new THREE.Mesh(
        new THREE.BoxGeometry(pagesW, H - 0.005, PAGES_T),
        [pageEdge, paper, pageEdge, pageEdge, paper, paper]
      );
      pages.name = 'page_block';
      pages.position.set(-W / 2 + pagesW / 2 + 0.0005, 0, 0);
      book.add(pages);

      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.055, 0.0006), gold);
      ribbon.name = 'ribbon_marker';
      ribbon.position.set(W / 2 - 0.028, -H / 2 - 0.020, 0);
      book.add(ribbon);

      book.rotation.y = -0.5;
      scene.add(book);

      const resize = () => {
        const box = this.getBoundingClientRect();
        const pbox = this.parentElement ? this.parentElement.getBoundingClientRect() : box;
        const w = Math.round(box.width || pbox.width) || 1;
        const h = Math.round(box.height || pbox.height) || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // frame the book: distance from its height, padded, plus slack for narrow boxes
        const vFit = (H * 1.16 / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
        const hFit = (W * 1.45 / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) / camera.aspect;
        camera.position.set(0, 0.02, Math.max(vFit, hFit));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };
      resize();
      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);

      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        book.rotation.y += dt * speed;
        renderer.render(scene, camera);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }
  }

  if (!customElements.get('book-3d')) customElements.define('book-3d', Book3D);
})();
